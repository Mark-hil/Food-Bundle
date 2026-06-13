-- Migration: Add Semester Subscriptions Support

ALTER TABLE subscriptions
ADD COLUMN duration_months integer NOT NULL DEFAULT 3,
ADD COLUMN deliveries_made integer NOT NULL DEFAULT 0;
