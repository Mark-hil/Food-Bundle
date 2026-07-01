-- Migration: Add Discount Settings

ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS free_delivery_threshold numeric NOT NULL DEFAULT 700.00,
ADD COLUMN IF NOT EXISTS subscription_food_discount_percent numeric NOT NULL DEFAULT 40.00,
ADD COLUMN IF NOT EXISTS subscription_delivery_discount_percent numeric NOT NULL DEFAULT 20.00;
