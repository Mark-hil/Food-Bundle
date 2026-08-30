-- Migration: Complete Role System & Security Policies
-- Purpose: Support all 6 roles (student, driver, support, packer, admin, super_admin) with proper RLS policies and role hierarchy enforcement.

-- 1. Helper Function: is_admin() - returns true for 'admin' and 'super_admin'
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
  RETURN v_role IN ('admin', 'super_admin');
END;
$$;

-- 2. Helper Function: is_super_admin() - returns true ONLY for 'super_admin'
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role = 'super_admin';
END;
$$;

-- 3. PROFILES POLICIES
-- Super admins can update any profile (including promoting/demoting admins)
DROP POLICY IF EXISTS "Super admins have full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
CREATE POLICY "Super admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Regular admins can update non-admin profiles (student, driver, support, packer) and cannot escalate them to admin/super_admin
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    is_admin() 
    AND NOT (role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    is_admin() 
    AND NOT (role IN ('admin', 'super_admin'))
  );

-- Super admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- 4. BUNDLES POLICIES
DROP POLICY IF EXISTS "Admins can manage all bundles" ON bundles;
CREATE POLICY "Admins can manage all bundles"
  ON bundles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 5. INVENTORY ITEMS POLICIES
DROP POLICY IF EXISTS "Admins can insert inventory items" ON inventory_items;
CREATE POLICY "Admins can insert inventory items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update inventory items" ON inventory_items;
CREATE POLICY "Admins can update inventory items"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete inventory items" ON inventory_items;
CREATE POLICY "Admins can delete inventory items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (is_admin());

-- 6. SYSTEM SETTINGS POLICIES
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 7. PROMO CODES POLICIES
DROP POLICY IF EXISTS "Admins manage promo codes" ON promo_codes;
CREATE POLICY "Admins manage promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 8. GUEST ORDERS POLICIES
DROP POLICY IF EXISTS "Admins can view all guest orders" ON guest_orders;
DROP POLICY IF EXISTS "Staff can view guest orders" ON guest_orders;
CREATE POLICY "Staff can view guest orders"
  ON guest_orders FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('support', 'packer'))
  );

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
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'packer')
    AND status IN ('confirmed', 'preparing', 'ready')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'packer')
  );

-- 9. CONTACT MESSAGES POLICIES
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
CREATE POLICY "Staff can view contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'support')
  );

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

-- 10. ORDER TIMELINE POLICIES
DROP POLICY IF EXISTS "Admins insert timeline entries" ON order_timeline;
CREATE POLICY "Staff insert timeline entries"
  ON order_timeline FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'packer')
  );

-- 11. REFERRALS, LOYALTY, SUBSCRIPTIONS ADMIN POLICIES
DROP POLICY IF EXISTS "Admins update referrals" ON referrals;
CREATE POLICY "Admins update referrals"
  ON referrals FOR UPDATE
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins update points" ON loyalty_points;
CREATE POLICY "Admins update points"
  ON loyalty_points FOR UPDATE
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins manage subscriptions" ON subscriptions;
CREATE POLICY "Admins manage subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
