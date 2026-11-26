-- ============================================================================
-- Migration: Comprehensive Security Hardening & Bug Fixes
-- Purpose:
--   1. Prevent privilege escalation on profiles.role (trigger + RLS WITH CHECK)
--   2. Lock down transactions UPDATE and loyalty_points INSERT policies
--   3. Add 'out_for_delivery' & custom_items to guest_orders, harden guest INSERT,
--      and add driver RLS policies for guest_orders
--   4. Fix subscriptions status CHECK constraint ('completed') & copy custom_items
--      and delivery_phone in handle_subscription_delivery()
--   5. Allow students to confirm delivery when order status is 'ready' or 'out_for_delivery'
--   6. Harden place_order RPC: verify auth.uid(), validate server-side subtotal/promo/points,
--      increment promo_codes.current_uses safely inside RPC, and award earned loyalty points
--      ONLY when order is actually confirmed (never on unpaid pending orders)
--   7. Harden simulate_payment_success RPC so it never overwrites a real Paystack reference
-- ============================================================================

-- 1. PREVENT ROLE ESCALATION ON PROFILES
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF public.is_admin()
     AND OLD.role NOT IN ('admin', 'super_admin')
     AND NEW.role NOT IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unauthorized: You do not have permission to change user roles.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_role_change();

CREATE OR REPLACE FUNCTION public.enforce_student_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin')
     OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  NEW.role := 'student';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_student_role_on_insert ON public.profiles;
CREATE TRIGGER trg_enforce_student_role_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_student_role_on_insert();


-- 2. LOCK DOWN TRANSACTIONS UPDATE & LOYALTY_POINTS INSERT POLICIES
DROP POLICY IF EXISTS "System can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
CREATE POLICY "Admins can update transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "System inserts points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Admins can insert points" ON public.loyalty_points;
CREATE POLICY "Admins can insert points"
  ON public.loyalty_points FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());


-- 3. FIX GUEST_ORDERS CONSTRAINTS, CUSTOM_ITEMS, HARDEN INSERT, AND ADD DRIVER RLS
ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS custom_items JSONB;

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  FOR v_constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'guest_orders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%payment_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.guest_orders DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.guest_orders
  ADD CONSTRAINT guest_orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'));

CREATE OR REPLACE FUNCTION public.validate_guest_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bundle_price NUMERIC;
BEGIN
  SELECT price INTO v_bundle_price
  FROM public.bundles
  WHERE id = NEW.bundle_id AND available = true;

  IF v_bundle_price IS NULL THEN
    RAISE EXCEPTION 'Selected bundle is not available.';
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be at least 1.';
  END IF;

  IF NEW.total_amount IS NULL OR NEW.total_amount < (v_bundle_price * NEW.quantity) THEN
    NEW.total_amount := (v_bundle_price * NEW.quantity) + COALESCE(NEW.delivery_fee, 0);
  END IF;

  NEW.status := 'pending';
  NEW.payment_status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_guest_order_insert ON public.guest_orders;
CREATE TRIGGER trg_validate_guest_order_insert
  BEFORE INSERT ON public.guest_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_guest_order_insert();

DROP POLICY IF EXISTS "Guests can create orders" ON public.guest_orders;
CREATE POLICY "Guests can create orders"
  ON public.guest_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND payment_status = 'pending'
    AND quantity > 0
    AND total_amount > 0
  );

DROP POLICY IF EXISTS "Drivers can view ready or assigned guest orders" ON public.guest_orders;
CREATE POLICY "Drivers can view ready or assigned guest orders"
  ON public.guest_orders FOR SELECT
  TO authenticated
  USING (
    public.is_driver()
    AND status IN ('ready', 'out_for_delivery', 'delivered')
    AND (driver_id IS NULL OR driver_id = auth.uid())
  );

DROP POLICY IF EXISTS "Drivers can update ready or assigned guest orders" ON public.guest_orders;
CREATE POLICY "Drivers can update ready or assigned guest orders"
  ON public.guest_orders FOR UPDATE
  TO authenticated
  USING (
    public.is_driver()
    AND (driver_id = auth.uid() OR (status = 'ready' AND driver_id IS NULL))
  )
  WITH CHECK (public.is_driver());


-- 4. FIX SUBSCRIPTIONS CHECK CONSTRAINT ('completed') & PRESERVE CUSTOM_ITEMS/PHONE
DO $$
DECLARE
  v_sub_constraint TEXT;
BEGIN
  FOR v_sub_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'subscriptions'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', v_sub_constraint);
  END LOOP;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'paused', 'cancelled', 'completed'));

CREATE OR REPLACE FUNCTION public.handle_subscription_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
  new_delivery_number INT;
  new_notes TEXT;
  next_date DATE;
BEGIN
  IF OLD.status != 'delivered' AND NEW.status = 'delivered' AND NEW.subscription_id IS NOT NULL THEN
    SELECT * INTO sub_record FROM public.subscriptions WHERE id = NEW.subscription_id;
    next_date := (CURRENT_DATE + INTERVAL '1 month')::DATE;

    IF (sub_record.deliveries_made + 1) < sub_record.duration_months THEN
      new_delivery_number := sub_record.deliveries_made + 2;
      new_notes := '[SEMESTER SUBSCRIPTION: Delivery ' || new_delivery_number || ' of ' || sub_record.duration_months || ']';

      UPDATE public.subscriptions
      SET deliveries_made = deliveries_made + 1,
          next_delivery_date = next_date
      WHERE id = NEW.subscription_id;

      INSERT INTO public.orders (
        student_id,
        bundle_id,
        subscription_id,
        quantity,
        total_amount,
        status,
        delivery_address,
        delivery_date,
        delivery_time,
        notes,
        pickup_pin,
        custom_items,
        delivery_phone
      ) VALUES (
        sub_record.student_id,
        sub_record.bundle_id,
        sub_record.id,
        sub_record.quantity,
        0,
        'confirmed',
        sub_record.delivery_address,
        next_date,
        sub_record.delivery_time,
        new_notes,
        floor(random() * 8999 + 1000)::text,
        sub_record.custom_items,
        NEW.delivery_phone
      );
    ELSIF (sub_record.deliveries_made + 1) >= sub_record.duration_months THEN
      UPDATE public.subscriptions
      SET deliveries_made = deliveries_made + 1,
          status = 'completed'
      WHERE id = NEW.subscription_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- 5. ALLOW STUDENTS TO CONFIRM DELIVERY FOR BOTH 'ready' AND 'out_for_delivery'
DROP POLICY IF EXISTS "Students can confirm delivery" ON public.orders;
CREATE POLICY "Students can confirm delivery"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND status IN ('ready', 'out_for_delivery'))
  WITH CHECK (student_id = auth.uid() AND status = 'delivered');


-- 6. HARDEN PLACE_ORDER RPC & AWARD LOYALTY POINTS ONLY ON CONFIRMATION
DROP FUNCTION IF EXISTS public.place_order(
  UUID, UUID, INT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, BOOLEAN, INT, INT
);
DROP FUNCTION IF EXISTS public.place_order(
  UUID, UUID, INT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, BOOLEAN, INT, INT, TEXT
);

CREATE OR REPLACE FUNCTION public.place_order(
  p_student_id UUID,
  p_bundle_id UUID,
  p_quantity INT,
  p_is_subscription BOOLEAN,
  p_delivery_address TEXT,
  p_delivery_time TEXT,
  p_delivery_date TEXT,
  p_notes TEXT,
  p_pickup_pin TEXT,
  p_custom_items JSONB,
  p_delivery_phone TEXT,
  p_total_amount NUMERIC,
  p_delivery_fee NUMERIC,
  p_use_points BOOLEAN,
  p_points_to_use INT,
  p_points_earned INT,
  p_promo_code TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID := NULL;
  v_order_id UUID;
  v_parsed_date DATE := NULL;
  v_current_balance INT := 0;
  v_bundle_price NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_sub_food_pct NUMERIC := 40;
  v_redemption_ratio INT := 100;
  v_min_redeem INT := 500;
  v_promo_discount NUMERIC := 0;
  v_points_discount NUMERIC := 0;
  v_sub_discount NUMERIC := 0;
  v_min_expected_total NUMERIC := 0;
  v_promo RECORD;
BEGIN
  IF auth.uid() IS NULL OR p_student_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: student_id must match authenticated user.';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero.';
  END IF;

  IF COALESCE(p_points_to_use, 0) < 0 OR COALESCE(p_points_earned, 0) < 0 THEN
    RAISE EXCEPTION 'Points values cannot be negative.';
  END IF;

  SELECT price INTO v_bundle_price
  FROM public.bundles
  WHERE id = p_bundle_id AND available = true;

  IF v_bundle_price IS NULL THEN
    RAISE EXCEPTION 'Selected bundle is not available.';
  END IF;

  SELECT
    COALESCE(subscription_food_discount_percent, 40),
    COALESCE(loyalty_redemption_ratio, 100),
    COALESCE(loyalty_min_points_to_redeem, 500)
  INTO v_sub_food_pct, v_redemption_ratio, v_min_redeem
  FROM public.system_settings
  WHERE id = 1;

  v_sub_food_pct := COALESCE(v_sub_food_pct, 40);
  v_redemption_ratio := COALESCE(NULLIF(v_redemption_ratio, 0), 100);
  v_min_redeem := COALESCE(v_min_redeem, 500);

  v_subtotal := v_bundle_price * p_quantity * (CASE WHEN p_is_subscription THEN 3 ELSE 1 END);

  IF p_is_subscription THEN
    v_sub_discount := v_subtotal * (v_sub_food_pct / 100.0);
  END IF;

  -- Validate & increment promo code atomically if supplied
  IF p_promo_code IS NOT NULL AND trim(p_promo_code) != '' THEN
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE upper(code) = upper(trim(p_promo_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at >= now())
      AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
    FOR UPDATE;

    IF v_promo.id IS NULL THEN
      RAISE EXCEPTION 'Promo code is invalid, expired, or has reached its usage limit.';
    END IF;

    IF v_promo.min_order_amount IS NOT NULL AND v_subtotal < v_promo.min_order_amount THEN
      RAISE EXCEPTION 'Order subtotal does not meet the promo code minimum.';
    END IF;

    IF v_promo.discount_type = 'percentage' THEN
      v_promo_discount := LEAST(v_subtotal, v_subtotal * (v_promo.discount_value / 100.0));
    ELSE
      v_promo_discount := LEAST(v_subtotal, v_promo.discount_value);
    END IF;

    UPDATE public.promo_codes
    SET current_uses = COALESCE(current_uses, 0) + 1
    WHERE id = v_promo.id;
  END IF;

  -- Check current loyalty points balance before allowing redemption
  SELECT balance INTO v_current_balance
  FROM public.loyalty_points
  WHERE student_id = p_student_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  IF p_use_points AND COALESCE(p_points_to_use, 0) > 0 THEN
    IF v_current_balance < v_min_redeem THEN
      RAISE EXCEPTION 'Minimum loyalty points threshold not met.';
    END IF;
    IF p_points_to_use > v_current_balance THEN
      RAISE EXCEPTION 'Insufficient loyalty points balance.';
    END IF;
    v_points_discount := LEAST(v_subtotal, (p_points_to_use::NUMERIC / v_redemption_ratio));
  END IF;

  -- Server-side minimum total verification (allows small rounding tolerance of GH₵ 0.50)
  v_min_expected_total := GREATEST(0, v_subtotal + COALESCE(p_delivery_fee, 0) - v_promo_discount - v_points_discount - v_sub_discount);
  IF p_total_amount IS NULL OR (p_total_amount + 0.50) < v_min_expected_total THEN
    RAISE EXCEPTION 'Invalid order total amount.';
  END IF;

  IF p_delivery_date IS NOT NULL AND p_delivery_date != '' THEN
    v_parsed_date := p_delivery_date::DATE;
  END IF;

  -- 1. Create Subscription if requested
  IF p_is_subscription THEN
    INSERT INTO public.subscriptions (
      student_id,
      bundle_id,
      frequency,
      quantity,
      delivery_address,
      delivery_time,
      status,
      next_delivery_date,
      duration_months,
      deliveries_made,
      custom_items
    ) VALUES (
      p_student_id,
      p_bundle_id,
      'monthly',
      p_quantity,
      p_delivery_address,
      p_delivery_time,
      'active',
      COALESCE(v_parsed_date, CURRENT_DATE),
      3,
      0,
      p_custom_items
    ) RETURNING id INTO v_subscription_id;
  END IF;

  -- 2. Create Order
  INSERT INTO public.orders (
    student_id,
    bundle_id,
    subscription_id,
    quantity,
    total_amount,
    delivery_fee,
    delivery_address,
    delivery_date,
    delivery_time,
    notes,
    status,
    pickup_pin,
    custom_items,
    delivery_phone
  ) VALUES (
    p_student_id,
    p_bundle_id,
    v_subscription_id,
    p_quantity,
    p_total_amount,
    COALESCE(p_delivery_fee, 0),
    p_delivery_address,
    v_parsed_date,
    p_delivery_time,
    p_notes,
    'pending',
    p_pickup_pin,
    p_custom_items,
    p_delivery_phone
  ) RETURNING id INTO v_order_id;

  -- 3. Create Transaction
  INSERT INTO public.transactions (
    order_id,
    student_id,
    amount,
    status
  ) VALUES (
    v_order_id,
    p_student_id,
    p_total_amount,
    'pending'
  );

  -- 4. Deduct Loyalty Points if used (points are only EARNED when payment confirms!)
  IF p_use_points AND COALESCE(p_points_to_use, 0) > 0 THEN
    v_current_balance := v_current_balance - p_points_to_use;
    INSERT INTO public.loyalty_points (
      student_id,
      points,
      balance,
      type,
      reference
    ) VALUES (
      p_student_id,
      -p_points_to_use,
      v_current_balance,
      'redeemed',
      'Order ' || substring(v_order_id::text from 1 for 8)
    );
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Award loyalty points ONLY when a paid order transitions from pending -> confirmed
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_order_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_amount NUMERIC := 10;
  v_step_points INT := 10;
  v_points_earned INT := 0;
  v_current_balance INT := 0;
  v_ref TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' AND COALESCE(NEW.total_amount, 0) > 0 THEN
    v_ref := 'Order ' || substring(NEW.id::text from 1 for 8);

    IF EXISTS (
      SELECT 1 FROM public.loyalty_points
      WHERE student_id = NEW.student_id
        AND type = 'earned'
        AND reference = v_ref
    ) THEN
      RETURN NEW;
    END IF;

    SELECT
      COALESCE(NULLIF(loyalty_earn_step_amount, 0), 10),
      COALESCE(loyalty_earn_step_points, 10)
    INTO v_step_amount, v_step_points
    FROM public.system_settings
    WHERE id = 1;

    v_step_amount := COALESCE(NULLIF(v_step_amount, 0), 10);
    v_step_points := COALESCE(v_step_points, 10);
    v_points_earned := floor(NEW.total_amount / v_step_amount)::INT * v_step_points;

    IF v_points_earned > 0 THEN
      SELECT balance INTO v_current_balance
      FROM public.loyalty_points
      WHERE student_id = NEW.student_id
      ORDER BY created_at DESC
      LIMIT 1;

      v_current_balance := COALESCE(v_current_balance, 0) + v_points_earned;

      INSERT INTO public.loyalty_points (
        student_id,
        points,
        balance,
        type,
        reference
      ) VALUES (
        NEW.student_id,
        v_points_earned,
        v_current_balance,
        'earned',
        v_ref
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_loyalty_points_on_order_confirmed ON public.orders;
CREATE TRIGGER trg_award_loyalty_points_on_order_confirmed
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points_on_order_confirmed();


-- 7. HARDEN SIMULATE_PAYMENT_SUCCESS RPC
-- Restrict execution to service_role/postgres or admins so clients cannot mark unpaid orders paid.
CREATE OR REPLACE FUNCTION public.simulate_payment_success(
  p_order_id UUID,
  p_is_guest BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_registered BOOLEAN;
BEGIN
  IF NOT (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Payment confirmation must be verified via Paystack.';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.orders WHERE id = p_order_id) INTO v_is_registered;

  IF v_is_registered THEN
    UPDATE public.transactions
    SET
      status = 'success',
      payment_reference = COALESCE(NULLIF(payment_reference, ''), 'ORDER-' || substring(p_order_id::text from 1 for 8))
    WHERE order_id = p_order_id;

    UPDATE public.orders
    SET status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
    WHERE id = p_order_id;
  ELSE
    UPDATE public.guest_orders
    SET
      payment_status = 'success',
      payment_reference = COALESCE(NULLIF(payment_reference, ''), 'ORDER-' || substring(p_order_id::text from 1 for 8)),
      status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
    WHERE id = p_order_id;
  END IF;
END;
$$;
