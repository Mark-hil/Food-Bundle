-- Migration: Add System Settings

CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name text NOT NULL DEFAULT 'FoodBundle',
  support_email text NOT NULL DEFAULT 'support@foodbundle.com',
  phone text NOT NULL DEFAULT '+1 (555) 123-4567',
  delivery_charge numeric NOT NULL DEFAULT 15.00,
  min_order_value numeric NOT NULL DEFAULT 20.00,
  business_hours text NOT NULL DEFAULT '9:00 AM - 6:00 PM',
  updated_at timestamptz DEFAULT now()
);

-- Insert default row
INSERT INTO system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view settings"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
