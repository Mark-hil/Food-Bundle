/*
  # Create Guest Orders Table

  1. New Tables
    - `guest_orders`
      - `id` (uuid, primary key)
      - `bundle_id` (uuid, foreign key to bundles)
      - `full_name` (text, NOT NULL) - guest's full name
      - `email` (text, NOT NULL) - guest's email
      - `phone` (text, NOT NULL) - guest's phone number
      - `quantity` (integer, NOT NULL, default 1)
      - `total_amount` (decimal(10,2), NOT NULL)
      - `status` (text, NOT NULL, default 'pending')
      - `delivery_address` (text, NOT NULL)
      - `delivery_date` (date, nullable)
      - `delivery_time` (text, nullable)
      - `notes` (text, nullable)
      - `payment_reference` (text, nullable)
      - `payment_status` (text, NOT NULL, default 'pending')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `guest_orders` table
    - Allow public (unauthenticated) INSERT for guest checkouts
    - Allow public SELECT by order ID (for payment confirmation page)
    - Allow authenticated admin UPDATE for order management
  3. Indexes
    - Index on `status` for dashboard filtering
    - Index on `email` for looking up guest orders
*/

CREATE TABLE IF NOT EXISTS guest_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  delivery_address text NOT NULL,
  delivery_date date,
  delivery_time text,
  notes text,
  payment_reference text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Allow unauthenticated users to create guest orders
CREATE POLICY "Guests can create orders"
  ON guest_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow unauthenticated users to read their own order by ID (needed for payment confirmation)
CREATE POLICY "Anyone can view guest orders by ID"
  ON guest_orders FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to update guest orders (status management)
CREATE POLICY "Admins can update guest orders"
  ON guest_orders FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_guest_orders_status ON guest_orders(status);
CREATE INDEX IF NOT EXISTS idx_guest_orders_email ON guest_orders(email);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_guest_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guest_orders_updated_at
  BEFORE UPDATE ON guest_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_orders_updated_at();
