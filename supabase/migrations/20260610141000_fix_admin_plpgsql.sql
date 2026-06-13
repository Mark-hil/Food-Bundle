/*
  # Fix infinite recursion properly using PL/pgSQL
  
  SQL language functions can be inlined by the query planner, which strips the SECURITY DEFINER context
  and executes the query as the calling user. By using PL/pgSQL, we prevent inlining and guarantee
  that RLS is bypassed when querying the profiles table.
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role = 'admin';
END;
$$;
