-- Migration: Add Delivery Fees to Orders

ALTER TABLE orders
ADD COLUMN delivery_fee numeric NOT NULL DEFAULT 0;

ALTER TABLE guest_orders
ADD COLUMN delivery_fee numeric NOT NULL DEFAULT 0;
