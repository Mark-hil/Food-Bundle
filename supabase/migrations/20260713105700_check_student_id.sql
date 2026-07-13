CREATE OR REPLACE FUNCTION public.check_student_id_exists(p_student_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM public.profiles WHERE student_id = p_student_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
