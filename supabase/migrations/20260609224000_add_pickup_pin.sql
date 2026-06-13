-- Add pickup_pin to orders
ALTER TABLE public.orders ADD COLUMN pickup_pin VARCHAR(4);

-- Add pickup_pin to guest_orders
ALTER TABLE public.guest_orders ADD COLUMN pickup_pin VARCHAR(4);
