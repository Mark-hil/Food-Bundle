/*
  # Allow Admins to View All Profiles
  
  Adds a policy to the profiles table that allows users with the 'admin' role to SELECT all profiles.
*/

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
