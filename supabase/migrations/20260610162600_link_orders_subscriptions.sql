-- 1. Add subscription_id to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- 2. Create the trigger function
CREATE OR REPLACE FUNCTION handle_subscription_delivery()
RETURNS TRIGGER AS $$
DECLARE
  sub_record RECORD;
  new_delivery_number INT;
  new_notes TEXT;
BEGIN
  -- Only proceed if status changed to 'delivered' and it has a subscription
  IF OLD.status != 'delivered' AND NEW.status = 'delivered' AND NEW.subscription_id IS NOT NULL THEN
    
    -- Get the subscription details
    SELECT * INTO sub_record FROM subscriptions WHERE id = NEW.subscription_id;
    
    -- Increment deliveries_made
    UPDATE subscriptions 
    SET deliveries_made = deliveries_made + 1 
    WHERE id = NEW.subscription_id;
    
    -- If there are more deliveries remaining, spawn the next order
    IF (sub_record.deliveries_made + 1) < sub_record.duration_months THEN
      new_delivery_number := sub_record.deliveries_made + 2;
      new_notes := '[SEMESTER SUBSCRIPTION: Delivery ' || new_delivery_number || ' of ' || sub_record.duration_months || ']';
      
      INSERT INTO orders (
        student_id,
        bundle_id,
        subscription_id,
        quantity,
        total_amount,
        status,
        delivery_address,
        delivery_date,
        delivery_time,
        notes,
        pickup_pin
      ) VALUES (
        sub_record.student_id,
        sub_record.bundle_id,
        sub_record.id,
        sub_record.quantity,
        0, -- Future deliveries have already been paid for
        'pending',
        sub_record.delivery_address,
        -- Schedule for 1 month later
        (CURRENT_DATE + INTERVAL '1 month')::DATE,
        sub_record.delivery_time,
        new_notes,
        floor(random() * 8999 + 1000)::text
      );
    ELSIF (sub_record.deliveries_made + 1) >= sub_record.duration_months THEN
      -- Mark subscription as completed if all deliveries are made
      UPDATE subscriptions 
      SET status = 'completed'
      WHERE id = NEW.subscription_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS tr_subscription_delivery ON orders;
CREATE TRIGGER tr_subscription_delivery
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_subscription_delivery();
