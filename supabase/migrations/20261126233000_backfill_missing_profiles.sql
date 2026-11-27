-- ============================================================================
-- Migration: Backfill Any Missing Profiles from auth.users & Safe student_id
-- Purpose:
--   1. Ensure any user in auth.users who signed up without a profile row is
--      backfilled into public.profiles
--   2. Normalize empty-string student_id ('') to NULL so UNIQUE(student_id)
--      never blocks signups when student_id is omitted
-- ============================================================================

UPDATE public.profiles
SET student_id = NULL
WHERE trim(COALESCE(student_id, '')) = '';

INSERT INTO public.profiles (id, email, full_name, phone, student_id, role, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.email, u.id::text || '@user.food-bundle.com'),
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(COALESCE(u.email, 'Student'), '@', 1)
  ),
  NULLIF(trim(u.raw_user_meta_data->>'phone'), ''),
  NULLIF(trim(u.raw_user_meta_data->>'student_id'), ''),
  'student',
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Also ensure handle_new_user converts empty student_id to NULL
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
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NULLIF(trim(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'student_id'), ''),
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

