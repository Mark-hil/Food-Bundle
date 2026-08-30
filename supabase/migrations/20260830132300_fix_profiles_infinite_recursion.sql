-- Migration: Fix infinite recursion on profiles and standardize role security definers
-- Purpose: Remove all recursive subqueries on profiles and replace them with PL/pgSQL SECURITY DEFINER helper functions.

-- 1. Helper Functions (PL/pgSQL SECURITY DEFINER prevents RLS recursion and query planner inlining)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'student');
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_role() IN ('admin', 'super_admin');
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_role() = 'super_admin';
END;
$$;

CREATE OR REPLACE FUNCTION is_driver()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_role() = 'driver';
END;
$$;

CREATE OR REPLACE FUNCTION is_support()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_role() = 'support';
END;
$$;

CREATE OR REPLACE FUNCTION is_packer()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_role() = 'packer';
END;
$$;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_role() IN ('admin', 'super_admin', 'support', 'packer', 'driver');
END;
$$;

-- 2. DROP ALL POTENTIALLY RECURSIVE POLICIES ON PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update non-admin profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins have full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Support can view profiles" ON profiles;
DROP POLICY IF EXISTS "Packers can view profiles" ON profiles;
DROP POLICY IF EXISTS "Drivers can view profiles of their order customers" ON profiles;
DROP POLICY IF EXISTS "Staff can view profiles" ON profiles;
DROP POLICY IF EXISTS "Allow user to view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow staff to view profiles" ON profiles;
DROP POLICY IF EXISTS "Users and staff can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- 3. RECREATE CLEAN, NON-RECURSIVE POLICIES ON PROFILES
-- SELECT: Users can view their own profile, OR any staff member (admin, super_admin, support, packer, driver) can view profiles
CREATE POLICY "Users and staff can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR is_staff()
  );

-- INSERT: User can insert own profile during registration
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Self update
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE: Super admin can update any profile (assign any role)
CREATE POLICY "Super admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- UPDATE: Regular admin can update non-admin profiles
CREATE POLICY "Admins can update non-admin profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin() AND NOT (role IN ('admin', 'super_admin')))
  WITH CHECK (is_admin() AND NOT (role IN ('admin', 'super_admin')));

-- DELETE: Admins / Super Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- 4. CLEAN UP ORDERS POLICIES (Use SECURITY DEFINER functions instead of subqueries)
DROP POLICY IF EXISTS "Support can view all orders" ON orders;
CREATE POLICY "Support can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (is_support());

DROP POLICY IF EXISTS "Packers can view orders for packing" ON orders;
CREATE POLICY "Packers can view orders for packing"
  ON orders FOR SELECT
  TO authenticated
  USING (is_packer());

DROP POLICY IF EXISTS "Packers can update order status" ON orders;
CREATE POLICY "Packers can update order status"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    is_packer()
    AND status IN ('confirmed', 'preparing', 'ready')
  )
  WITH CHECK (is_packer());

DROP POLICY IF EXISTS "Super admins have full access to orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 5. CLEAN UP GUEST ORDERS POLICIES
DROP POLICY IF EXISTS "Admins can view all guest orders" ON guest_orders;
DROP POLICY IF EXISTS "Staff can view guest orders" ON guest_orders;
CREATE POLICY "Staff can view guest orders"
  ON guest_orders FOR SELECT
  TO authenticated
  USING (is_admin() OR is_support() OR is_packer());

DROP POLICY IF EXISTS "Admins can update guest orders" ON guest_orders;
CREATE POLICY "Admins can update guest orders"
  ON guest_orders FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Packers can update guest orders" ON guest_orders;
CREATE POLICY "Packers can update guest orders"
  ON guest_orders FOR UPDATE
  TO authenticated
  USING (
    is_packer()
    AND status IN ('confirmed', 'preparing', 'ready')
  )
  WITH CHECK (is_packer());

-- 6. CLEAN UP CONTACT MESSAGES POLICIES
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Staff can view contact messages" ON contact_messages;
CREATE POLICY "Staff can view contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (is_admin() OR is_support());

DROP POLICY IF EXISTS "Admins can update contact messages" ON contact_messages;
CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete contact messages" ON contact_messages;
CREATE POLICY "Admins can delete contact messages"
  ON contact_messages FOR DELETE
  TO authenticated
  USING (is_admin());

-- 7. CLEAN UP ORDER TIMELINE POLICIES
DROP POLICY IF EXISTS "Admins insert timeline entries" ON order_timeline;
DROP POLICY IF EXISTS "Staff insert timeline entries" ON order_timeline;
CREATE POLICY "Staff insert timeline entries"
  ON order_timeline FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR is_packer());

DROP POLICY IF EXISTS "Users view own order timeline" ON order_timeline;
CREATE POLICY "Users and staff view order timeline"
  ON order_timeline FOR SELECT
  TO authenticated
  USING (
    is_staff()
    OR EXISTS (SELECT 1 FROM orders WHERE orders.id = order_timeline.order_id AND orders.student_id = auth.uid())
  );
