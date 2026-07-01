-- Migration: Add Customizable Bundles Support

-- 1. Add fields to bundles table
ALTER TABLE bundles
ADD COLUMN is_customizable boolean DEFAULT false,
ADD COLUMN customization_options jsonb DEFAULT '[]'::jsonb;

-- 2. Add fields to orders table
ALTER TABLE orders
ADD COLUMN custom_items jsonb DEFAULT NULL;

-- 3. Add fields to subscriptions table (if it exists)
-- Since it was added in a previous migration, we can safely alter it
ALTER TABLE subscriptions
ADD COLUMN custom_items jsonb DEFAULT NULL;
