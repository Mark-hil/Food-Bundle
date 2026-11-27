-- ============================================================================
-- Migration: Add Referral Buyer Discount, Commission & Minimum Payout Settings
-- Purpose:
--   1. Add referral_buyer_discount, referral_commission_per_order, and
--      referral_min_payout_amount columns to public.system_settings
--   2. Ensure promo_codes and orders/guest_orders have ambassador & promo columns
--   3. Update generate_student_referral_code() to read from system_settings
--   4. Reload PostgREST schema cache so the columns are immediately available
-- ============================================================================

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS referral_buyer_discount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS referral_commission_per_order NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS referral_min_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 45.00;

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS ambassador_name TEXT,
  ADD COLUMN IF NOT EXISTS ambassador_phone TEXT,
  ADD COLUMN IF NOT EXISTS commission_per_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_paid NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

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

  UPDATE public.profiles
  SET referral_code = v_clean_code
  WHERE id = v_user_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_id = v_user_id AND referral_code = v_clean_code AND referred_id IS NULL
  ) THEN
    INSERT INTO public.referrals (referrer_id, referral_code)
    VALUES (v_user_id, v_clean_code);
  END IF;

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

NOTIFY pgrst, 'reload schema';

