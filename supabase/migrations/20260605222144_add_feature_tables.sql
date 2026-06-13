/*
  # Feature Expansion: Promo Codes, Reviews, Referrals, Loyalty, Subscriptions, Order Timeline

  1. New Tables
    - `promo_codes` - discount coupons
    - `bundle_reviews` - customer reviews and ratings
    - `referrals` - referral tracking
    - `loyalty_points` - points ledger per user
    - `subscriptions` - recurring bundle orders
    - `order_timeline` - status change log with timestamps

  2. Security
    - RLS enabled on all tables
    - Appropriate policies for each table
*/

-- ============================================
-- ORDER TIMELINE (status change log)
-- ============================================
CREATE TABLE IF NOT EXISTS order_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own order timeline" ON order_timeline FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_timeline.order_id AND orders.student_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins insert timeline entries" ON order_timeline FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);

-- Auto-insert timeline entry on order creation (trigger)
CREATE OR REPLACE FUNCTION insert_order_timeline_on_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_timeline (order_id, status, note)
  VALUES (NEW.id, 'pending', 'Order placed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_created_timeline
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION insert_order_timeline_on_create();

-- Auto-insert timeline entry on order status change (trigger)
CREATE OR REPLACE FUNCTION insert_order_timeline_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_timeline (order_id, status, note, created_by)
    VALUES (NEW.id, NEW.status, 'Status updated to ' || NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_status_timeline
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION insert_order_timeline_on_status_change();

-- ============================================
-- PROMO CODES
-- ============================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount decimal(10,2) DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo codes" ON promo_codes FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Anyone can read active promo codes" ON promo_codes FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- ============================================
-- BUNDLE REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS bundle_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bundle_id, student_id)
);

ALTER TABLE bundle_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON bundle_reviews FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users create reviews" ON bundle_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users update own reviews" ON bundle_reviews FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users delete own reviews" ON bundle_reviews FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_bundle_reviews_bundle_id ON bundle_reviews(bundle_id);

-- ============================================
-- REFERRALS
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  referred_email text,
  referred_id uuid REFERENCES profiles(id),
  reward_given boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON referrals FOR SELECT
  TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Users create referrals" ON referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins update referrals" ON referrals FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- ============================================
-- LOYALTY POINTS
-- ============================================
CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points integer NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'expired')),
  reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own points" ON loyalty_points FOR SELECT
  TO authenticated USING (student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "System inserts points" ON loyalty_points FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Admins update points" ON loyalty_points FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_loyalty_points_student ON loyalty_points(student_id);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE RESTRICT,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  delivery_address text NOT NULL,
  delivery_time text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_delivery_date date NOT NULL,
  discount_percentage decimal(5,2) DEFAULT 5.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Users create subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users update own subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins manage subscriptions" ON subscriptions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_delivery ON subscriptions(next_delivery_date);
