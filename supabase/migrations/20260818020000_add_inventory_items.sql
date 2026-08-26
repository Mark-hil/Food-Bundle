-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category TEXT,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Set up Row Level Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Anyone can view inventory items
DROP POLICY IF EXISTS "Anyone can view inventory items" ON inventory_items;
CREATE POLICY "Anyone can view inventory items"
    ON inventory_items FOR SELECT
    USING (true);

-- Only admins can insert inventory items
DROP POLICY IF EXISTS "Admins can insert inventory items" ON inventory_items;
CREATE POLICY "Admins can insert inventory items"
    ON inventory_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Only admins can update inventory items
DROP POLICY IF EXISTS "Admins can update inventory items" ON inventory_items;
CREATE POLICY "Admins can update inventory items"
    ON inventory_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Only admins can delete inventory items
DROP POLICY IF EXISTS "Admins can delete inventory items" ON inventory_items;
CREATE POLICY "Admins can delete inventory items"
    ON inventory_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
