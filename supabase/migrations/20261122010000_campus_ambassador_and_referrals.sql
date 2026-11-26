-- ============================================================================
-- Migration: Campus Ambassador Commission Tracking & Student Referrals
-- Purpose:
--   1. Add ambassador fields (name, phone, commission_per_order, commission_paid)
--      to promo_codes
--   2. Track promo_code and discount_amount on orders and guest_orders
--   3. Validate & apply promo_code server-side in validate_guest_order_insert()
--      and place_order()
--   4. Fix referrals unique constraint so a referrer can invite unlimited friends,
--      add referral_code on profiles, automate referral capture in handle_new_user()
--      and claim_referral(), and award 200 bonus points when referred friend pays
-- ============================================================================

-- 1. EXTEND PROMO_CODES FOR CAMPUS AMBASSADORS
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS ambassador_name TEXT,
  ADD COLUMN IF NOT EXISTS ambassador_phone TEXT,
  ADD COLUMN IF NOT EXISTS commission_per_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_paid NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 2. TRACK PROMO_CODE & DISCOUNT_AMOUNT ON ORDERS AND GUEST_ORDERS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_promo_code ON public.orders(promo_code);
CREATE INDEX IF NOT EXISTS idx_guest_orders_promo_code ON public.guest_orders(promo_code);

-- 3. UPDATE GUEST ORDER VALIDATION TRIGGER TO SUPPORT PROMO / AMBASSADOR CODES
CREATE OR REPLACE FUNCTION public.validate_guest_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bundle_price NUMERIC;
  v_subtotal NUMERIC;
  v_promo RECORD;
  v_promo_discount NUMERIC := 0;
  v_min_expected_total NUMERIC;
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

  v_subtotal := v_bundle_price * NEW.quantity;

  -- Server-side promo/ambassador code validation & atomic usage increment
  IF NEW.promo_code IS NOT NULL AND trim(NEW.promo_code) != '' THEN
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE upper(code) = upper(trim(NEW.promo_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at >= now())
      AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
    FOR UPDATE;

    IF v_promo.id IS NULL THEN
      RAISE EXCEPTION 'Promo or ambassador code is invalid, expired, or has reached its usage limit.';
    END IF;

    IF v_promo.min_order_amount IS NOT NULL AND v_subtotal < v_promo.min_order_amount THEN
      RAISE EXCEPTION 'Order subtotal does not meet the minimum required for this code.';
    END IF;

    IF v_promo.discount_type = 'percentage' THEN
      v_promo_discount := LEAST(v_subtotal, v_subtotal * (v_promo.discount_value / 100.0));
    ELSE
      v_promo_discount := LEAST(v_subtotal, v_promo.discount_value);
    END IF;

    NEW.promo_code := v_promo.code;
    NEW.discount_amount := v_promo_discount;

    UPDATE public.promo_codes
    SET current_uses = COALESCE(current_uses, 0) + 1
    WHERE id = v_promo.id;
  ELSE
    NEW.promo_code := NULL;
    NEW.discount_amount := 0;
  END IF;

  v_min_expected_total := GREATEST(0, v_subtotal - COALESCE(NEW.discount_amount, 0));

  IF NEW.total_amount IS NULL OR (NEW.total_amount + 0.50) < v_min_expected_total THEN
    NEW.total_amount := v_min_expected_total + COALESCE(NEW.delivery_fee, 0);
  END IF;

  NEW.status := 'pending';
  NEW.payment_status := 'pending';
  RETURN NEW;
END;
$$;

-- 4. UPDATE PLACE_ORDER TO RECORD PROMO_CODE & DISCOUNT_AMOUNT ON ORDERS
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
  v_applied_promo_code TEXT := NULL;
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

  -- Validate & increment promo/ambassador code atomically if supplied
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

    v_applied_promo_code := v_promo.code;

    UPDATE public.promo_codes
    SET current_uses = COALESCE(current_uses, 0) + 1
    WHERE id = v_promo.id;
  ELSE
    -- If student signed up via a referral link (?ref=CODE), tag their first order automatically
    -- so the referrer earns both cash commission in /admin/promos and loyalty points
    SELECT r.referral_code INTO v_applied_promo_code
    FROM public.referrals r
    WHERE r.referred_id = p_student_id
      AND COALESCE(r.reward_given, false) = false
    ORDER BY r.created_at ASC
    LIMIT 1;
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

  v_min_expected_total := GREATEST(0, v_subtotal + COALESCE(p_delivery_fee, 0) - v_promo_discount - v_points_discount - v_sub_discount);
  IF p_total_amount IS NULL OR (p_total_amount + 0.50) < v_min_expected_total THEN
    RAISE EXCEPTION 'Invalid order total amount.';
  END IF;

  IF p_delivery_date IS NOT NULL AND p_delivery_date != '' THEN
    v_parsed_date := p_delivery_date::DATE;
  END IF;

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
    delivery_phone,
    promo_code,
    discount_amount
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
    p_delivery_phone,
    v_applied_promo_code,
    v_promo_discount
  ) RETURNING id INTO v_order_id;

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


-- 5. FIX REFERRALS SCHEMA & AUTOMATE STUDENT REFERRAL CAPTURE + 200-POINT BONUS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Allow multiple referrals to share the same referrer's code
ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_referral_code_key;

CREATE INDEX IF NOT EXISTS idx_referrals_code_nonunique ON public.referrals(referral_code);

-- Backfill profiles.referral_code from any existing rows in referrals
UPDATE public.profiles p
SET referral_code = r.referral_code
FROM (
  SELECT DISTINCT ON (referrer_id) referrer_id, referral_code
  FROM public.referrals
  ORDER BY referrer_id, created_at ASC
) r
WHERE p.id = r.referrer_id
  AND p.referral_code IS NULL;

-- Update handle_new_user() to link referred signups automatically when ?ref=CODE is passed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_code TEXT;
  v_referrer_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, student_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'student_id',
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

  v_ref_code := upper(trim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  IF v_ref_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE upper(referral_code) = v_ref_code
    LIMIT 1;

    IF v_referrer_id IS NULL THEN
      SELECT referrer_id INTO v_referrer_id
      FROM public.referrals
      WHERE upper(referral_code) = v_ref_code
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
        INSERT INTO public.referrals (referrer_id, referral_code, referred_email, referred_id, reward_given)
        VALUES (v_referrer_id, v_ref_code, NEW.email, NEW.id, false);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- RPC for logged-in users to claim a referral code if needed
CREATE OR REPLACE FUNCTION public.claim_referral(p_referral_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_ref_code TEXT := upper(trim(COALESCE(p_referral_code, '')));
  v_referrer_id UUID;
BEGIN
  IF v_user_id IS NULL OR v_ref_code = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_user_id) THEN
    RETURN false;
  END IF;

  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;

  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE upper(referral_code) = v_ref_code
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    SELECT referrer_id INTO v_referrer_id
    FROM public.referrals
    WHERE upper(referral_code) = v_ref_code
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_referrer_id IS NULL OR v_referrer_id = v_user_id THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (referrer_id, referral_code, referred_email, referred_id, reward_given)
  VALUES (v_referrer_id, v_ref_code, v_user_email, v_user_id, false);

  RETURN true;
END;
$$;

-- Update order confirmation trigger to also award 200 bonus points to the student referrer
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
  v_referral RECORD;
  v_referrer_balance INT := 0;
  v_bonus_points INT := 200;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' AND COALESCE(NEW.total_amount, 0) > 0 THEN
    v_ref := 'Order ' || substring(NEW.id::text from 1 for 8);

    IF NOT EXISTS (
      SELECT 1 FROM public.loyalty_points
      WHERE student_id = NEW.student_id
        AND type = 'earned'
        AND reference = v_ref
    ) THEN
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

    -- Award 200 bonus loyalty points to the referrer on the referred friend's first confirmed order
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE referred_id = NEW.student_id
      AND COALESCE(reward_given, false) = false
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_referral.id IS NOT NULL THEN
      UPDATE public.referrals
      SET reward_given = true
      WHERE id = v_referral.id;

      SELECT balance INTO v_referrer_balance
      FROM public.loyalty_points
      WHERE student_id = v_referral.referrer_id
      ORDER BY created_at DESC
      LIMIT 1;

      v_referrer_balance := COALESCE(v_referrer_balance, 0) + v_bonus_points;

      INSERT INTO public.loyalty_points (
        student_id,
        points,
        balance,
        type,
        reference
      ) VALUES (
        v_referral.referrer_id,
        v_bonus_points,
        v_referrer_balance,
        'bonus',
        'Referral Bonus (' || substring(NEW.student_id::text from 1 for 8) || ')'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. CONFIGURABLE REFERRAL BUYER DISCOUNT, COMMISSION & MIN PAYOUT THRESHOLD
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS referral_buyer_discount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS referral_commission_per_order NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS referral_min_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 45.00;

-- 7. AUTO-SYNC STUDENT REFERRAL CODES TO PROMO_CODES FOR ADMIN COMMISSION PAYOUTS
CREATE OR REPLACE FUNCTION public.generate_student_referral_code(p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_code TEXT := upper(trim(COALESCE(p_code, '')));
  v_full_name TEXT;
  v_phone TEXT;
  v_buyer_discount NUMERIC := 10.00;
  v_commission NUMERIC := 15.00;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_clean_code = '' OR length(v_clean_code) < 4 THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  SELECT full_name, phone
  INTO v_full_name, v_phone
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT
    COALESCE(referral_buyer_discount, 10.00),
    COALESCE(referral_commission_per_order, 15.00)
  INTO v_buyer_discount, v_commission
  FROM public.system_settings
  WHERE id = 1;

  v_buyer_discount := COALESCE(v_buyer_discount, 10.00);
  v_commission := COALESCE(v_commission, 15.00);

  -- Save on profile
  UPDATE public.profiles
  SET referral_code = v_clean_code
  WHERE id = v_user_id;

  -- Create base referral row if not already present
  IF NOT EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_id = v_user_id AND referral_code = v_clean_code AND referred_id IS NULL
  ) THEN
    INSERT INTO public.referrals (referrer_id, referral_code)
    VALUES (v_user_id, v_clean_code);
  END IF;

  -- Register in promo_codes so it works at Guest & Student Checkout AND appears in /admin/promos
  INSERT INTO public.promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    is_active,
    current_uses,
    ambassador_name,
    ambassador_phone,
    commission_per_order,
    commission_paid
  ) VALUES (
    v_clean_code,
    'Student Referral Code (' || COALESCE(NULLIF(trim(v_full_name), ''), 'Student') || ')',
    'fixed',
    v_buyer_discount,
    true,
    0,
    COALESCE(NULLIF(trim(v_full_name), ''), 'Student Referrer'),
    v_phone,
    v_commission,
    0
  )
  ON CONFLICT (code) DO UPDATE SET
    ambassador_name = COALESCE(public.promo_codes.ambassador_name, EXCLUDED.ambassador_name),
    ambassador_phone = COALESCE(public.promo_codes.ambassador_phone, EXCLUDED.ambassador_phone);

  RETURN v_clean_code;
END;
$$;

-- Backfill any existing student referral codes into promo_codes
INSERT INTO public.promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  is_active,
  current_uses,
  ambassador_name,
  ambassador_phone,
  commission_per_order,
  commission_paid
)
SELECT
  upper(trim(p.referral_code)),
  'Student Referral Code (' || COALESCE(NULLIF(trim(p.full_name), ''), 'Student') || ')',
  'fixed',
  10.00,
  true,
  0,
  COALESCE(NULLIF(trim(p.full_name), ''), 'Student Referrer'),
  p.phone,
  15.00,
  0
FROM public.profiles p
WHERE p.referral_code IS NOT NULL AND trim(p.referral_code) != ''
ON CONFLICT (code) DO NOTHING;

