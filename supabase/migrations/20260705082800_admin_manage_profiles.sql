-- Migration: Allow admins to manage profiles
-- Purpose: Currently admins can view all profiles but lack the RLS policy to update them (e.g. changing roles)

-- Add UPDATE policy for admins
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add DELETE policy for admins (useful for user management)
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());
