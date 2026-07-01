ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS loyalty_earn_step_amount numeric NOT NULL DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS loyalty_earn_step_points integer NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS loyalty_redemption_ratio integer NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS loyalty_min_points_to_redeem integer NOT NULL DEFAULT 500;
