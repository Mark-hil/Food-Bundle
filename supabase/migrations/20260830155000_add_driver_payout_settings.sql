-- Migration: Add Driver Payout & Batch Drop Bonus Settings

ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS driver_payout_percent numeric NOT NULL DEFAULT 90.00,
ADD COLUMN IF NOT EXISTS driver_batch_bonus numeric NOT NULL DEFAULT 5.00;
