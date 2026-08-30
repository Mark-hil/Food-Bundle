-- Migration: Add Super Admin, Support & Packer Roles
-- Purpose: Expand the role system with super_admin, support, and packer roles.

-- 1. Update Profile Role Constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE profiles ADD CONSTRAINT valid_role CHECK (role IN ('student', 'admin', 'super_admin', 'driver', 'support', 'packer'));

-- 2. RLS: Support users can view orders (read-only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Support can view all orders') THEN
    CREATE POLICY "Support can view all orders"
      ON orders FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'support')
      );
  END IF;
END $$;

-- 3. RLS: Packers can view and update orders (for preparing/packing workflow)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Packers can view orders for packing') THEN
    CREATE POLICY "Packers can view orders for packing"
      ON orders FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'packer')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Packers can update order status') THEN
    CREATE POLICY "Packers can update order status"
      ON orders FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'packer')
        AND status IN ('confirmed', 'preparing', 'ready')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'packer')
      );
  END IF;
END $$;

-- 4. RLS: Support and Packer can view profiles (needed for order details)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Support can view profiles') THEN
    CREATE POLICY "Support can view profiles"
      ON profiles FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'support')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Packers can view profiles') THEN
    CREATE POLICY "Packers can view profiles"
      ON profiles FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'packer')
      );
  END IF;
END $$;

-- 5. Super admin inherits all admin policies automatically since we check role = 'admin' OR role = 'super_admin'
-- The app-level AuthContext treats super_admin as admin, so existing admin RLS policies
-- won't match. We add a blanket policy for super_admin.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins have full access to orders') THEN
    CREATE POLICY "Super admins have full access to orders"
      ON orders FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins have full access to profiles') THEN
    CREATE POLICY "Super admins have full access to profiles"
      ON profiles FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
      );
  END IF;
END $$;
