/*
  # Food Bundle Purchase System Database Schema

  ## Overview
  This migration creates the complete database schema for the UENR Food Bundle Purchase System,
  including user profiles, food bundles, orders, and payment transactions.

  ## 1. New Tables

  ### `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text, not null)
  - `phone` (text)
  - `student_id` (text, unique) - For students only
  - `role` (text, not null) - 'student' or 'admin'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `bundles`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `description` (text)
  - `price` (decimal, not null)
  - `image_url` (text)
  - `items` (jsonb) - Array of food items included
  - `available` (boolean, default true)
  - `delivery_days` (text[]) - Days of the week for delivery
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `orders`
  - `id` (uuid, primary key)
  - `student_id` (uuid, references profiles)
  - `bundle_id` (uuid, references bundles)
  - `quantity` (integer, not null)
  - `total_amount` (decimal, not null)
  - `status` (text, default 'pending') - pending, confirmed, preparing, ready, delivered, cancelled
  - `delivery_address` (text, not null)
  - `delivery_date` (date)
  - `delivery_time` (text)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `transactions`
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders)
  - `student_id` (uuid, references profiles)
  - `amount` (decimal, not null)
  - `payment_method` (text, default 'paystack')
  - `payment_reference` (text, unique)
  - `status` (text, default 'pending') - pending, success, failed
  - `metadata` (jsonb)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Security

  - Enable RLS on all tables
  - Students can read their own profile and update specific fields
  - Students can read all available bundles
  - Students can create orders and view their own orders
  - Students can view their own transactions
  - Admins can manage all resources
  - Public can read available bundles (for browse before login)

  ## 3. Indexes

  - Index on profile role for efficient admin queries
  - Index on order status for dashboard filtering
  - Index on transaction status for payment tracking
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  student_id text UNIQUE,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('student', 'admin'))
);

-- Create bundles table
CREATE TABLE IF NOT EXISTS bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  image_url text,
  items jsonb DEFAULT '[]'::jsonb,
  available boolean DEFAULT true,
  delivery_days text[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  total_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  delivery_address text NOT NULL,
  delivery_date date,
  delivery_time text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  CONSTRAINT valid_quantity CHECK (quantity > 0)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text DEFAULT 'paystack',
  payment_reference text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'success', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_orders_student_id ON orders(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Bundles policies
CREATE POLICY "Anyone can view available bundles"
  ON bundles FOR SELECT
  USING (available = true);

CREATE POLICY "Admins can manage bundles"
  ON bundles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Orders policies
CREATE POLICY "Students can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Students can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Students can cancel own pending orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'pending')
  WITH CHECK (student_id = auth.uid() AND status IN ('pending', 'cancelled'));

-- Transactions policies
CREATE POLICY "Students can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Students can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "System can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bundles_updated_at BEFORE UPDATE ON bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();