CREATE OR REPLACE FUNCTION handle_subscription_delivery()
RETURNS TRIGGER AS $$
DECLARE
  sub_record RECORD;
  new_delivery_number INT;
  new_notes TEXT;
  next_date DATE;
BEGIN
  -- Only proceed if status changed to 'delivered' and it has a subscription
  IF OLD.status != 'delivered' AND NEW.status = 'delivered' AND NEW.subscription_id IS NOT NULL THEN
    
    -- Get the subscription details
    SELECT * INTO sub_record FROM subscriptions WHERE id = NEW.subscription_id;
    
    -- Calculate next delivery date
    next_date := (CURRENT_DATE + INTERVAL '1 month')::DATE;

    -- If there are more deliveries remaining, spawn the next order
    IF (sub_record.deliveries_made + 1) < sub_record.duration_months THEN
      new_delivery_number := sub_record.deliveries_made + 2;
      new_notes := '[SEMESTER SUBSCRIPTION: Delivery ' || new_delivery_number || ' of ' || sub_record.duration_months || ']';
      
      -- Update subscription with incremented deliveries and next date
      UPDATE subscriptions 
      SET deliveries_made = deliveries_made + 1,
          next_delivery_date = next_date
      WHERE id = NEW.subscription_id;

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
        next_date,
        sub_record.delivery_time,
        new_notes,
        floor(random() * 8999 + 1000)::text
      );
    ELSIF (sub_record.deliveries_made + 1) >= sub_record.duration_months THEN
      -- Mark subscription as completed if all deliveries are made
      UPDATE subscriptions 
      SET deliveries_made = deliveries_made + 1,
          status = 'completed'
      WHERE id = NEW.subscription_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix any existing out-of-sync subscriptions
UPDATE subscriptions s
SET next_delivery_date = o.delivery_date
FROM orders o
WHERE o.subscription_id = s.id 
  AND o.status = 'pending' 
  AND s.status = 'active';
