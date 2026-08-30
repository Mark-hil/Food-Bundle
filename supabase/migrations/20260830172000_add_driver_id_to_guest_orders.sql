-- Add driver_id to guest_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guest_orders' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE public.guest_orders 
    ADD COLUMN driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on driver_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_guest_orders_driver_id ON public.guest_orders(driver_id);
