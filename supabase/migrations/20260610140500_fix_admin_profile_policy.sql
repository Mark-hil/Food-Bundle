/*
  # Fix infinite recursion in admin profile policy
  
  Drops the recursive policy and implements a safe admin check using a SECURITY DEFINER function.
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a security definer function to check admin status without triggering RLS recursively
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Create the new non-recursive policy
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );
