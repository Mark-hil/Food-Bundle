-- Create delivery_zones table for multi-city, campus, and inter-city shipping management
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_name TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    estimated_time TEXT DEFAULT '20-35 mins',
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (customers, guests, drivers) can view active delivery zones
CREATE POLICY "Allow public read access for delivery_zones"
ON public.delivery_zones
FOR SELECT
USING (true);

-- 2. Only Admins can insert, update, or delete delivery zones
CREATE POLICY "Allow admin full access on delivery_zones"
ON public.delivery_zones
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Seed Initial Standard Campus Hubs & Regional Delivery Zones
INSERT INTO public.delivery_zones (hub_name, zone_name, delivery_fee, estimated_time, is_active, display_order)
VALUES 
  -- KNUST / Kumasi Hub
  ('KNUST / Kumasi Area', 'Main Campus (Republic, Unity, Queen''s, Africa Hall)', 8.00, '20-30 mins', true, 1),
  ('KNUST / Kumasi Area', 'Ayeduase / Gaza / Brunei / New Hall Hostels', 10.00, '25-35 mins', true, 2),
  ('KNUST / Kumasi Area', 'Kotei / Boadi Environs', 12.00, '30-40 mins', true, 3),
  ('KNUST / Kumasi Area', 'Bomso / Kentinkrono / Tech Junction', 10.00, '25-35 mins', true, 4),

  -- UENR / Sunyani Hub
  ('UENR / Sunyani Area', 'UENR Campus & Hostels', 8.00, '20-30 mins', true, 5),
  ('UENR / Sunyani Area', 'Berlin Top / Fiapre', 12.00, '30-45 mins', true, 6),
  ('UENR / Sunyani Area', 'Sunyani Town / Poly Area', 10.00, '25-35 mins', true, 7),

  -- Accra / Legon / UPSA Hub
  ('Accra / Legon / UPSA Area', 'Legon Main Campus / Pentagon / Evandy', 12.00, '30-45 mins', true, 8),
  ('Accra / Legon / UPSA Area', 'UPSA / Madina Environs', 15.00, '35-50 mins', true, 9),
  ('Accra / Legon / UPSA Area', 'ATU / Central Accra', 15.00, '35-50 mins', true, 10),

  -- Inter-City Regional Parcel Delivery
  ('Inter-City Regional Courier (Nationwide)', 'VIP Bus / STC Parcel Station Pickup (Accra, Sunyani, Takoradi, Cape Coast, Tamale, etc.)', 40.00, '24-48 hours', true, 11)
ON CONFLICT DO NOTHING;
