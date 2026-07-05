-- Migration: Add Driver Role and Order Assignment
-- Purpose: Introduce the driver role for delivery personnel, update order statuses, and add RLS policies.

-- 1. Update Profile Roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE profiles ADD CONSTRAINT valid_role CHECK (role IN ('student', 'admin', 'driver'));

-- 2. Update Orders Table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE orders ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'));

-- 3. RLS Policies for Drivers on Orders table
CREATE POLICY "Drivers can view ready or assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'driver')
    AND (status IN ('ready', 'out_for_delivery', 'delivered') AND (driver_id IS NULL OR driver_id = auth.uid()))
  );

CREATE POLICY "Drivers can update ready or assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'driver')
    AND (driver_id = auth.uid() OR (status = 'ready' AND driver_id IS NULL))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'driver')
  );

-- 4. Give Drivers access to view user profiles (needed to see delivery info)
CREATE POLICY "Drivers can view profiles of their order customers"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'driver')
  );

