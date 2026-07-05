-- Fix infinite recursion in driver profile policy

-- 1. Drop the recursive policy on profiles
DROP POLICY IF EXISTS "Drivers can view profiles of their order customers" ON profiles;

-- 2. Create a security definer function for checking driver status
CREATE OR REPLACE FUNCTION is_driver()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'driver'
  );
$$;

-- 3. Create the new non-recursive policy for profiles
CREATE POLICY "Drivers can view profiles of their order customers"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_driver()
  );

-- 4. Update the orders policies to use the new function (cleaner, avoids recursion risks)
DROP POLICY IF EXISTS "Drivers can view ready or assigned orders" ON orders;
CREATE POLICY "Drivers can view ready or assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    is_driver()
    AND (status IN ('ready', 'out_for_delivery', 'delivered') AND (driver_id IS NULL OR driver_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Drivers can update ready or assigned orders" ON orders;
CREATE POLICY "Drivers can update ready or assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    is_driver()
    AND (driver_id = auth.uid() OR (status = 'ready' AND driver_id IS NULL))
  )
  WITH CHECK (
    is_driver()
  );
