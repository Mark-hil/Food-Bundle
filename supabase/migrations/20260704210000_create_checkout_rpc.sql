-- Migration: Create Checkout RPC
-- Purpose: Consolidate multiple inserts during checkout into a single transaction to improve scalability

CREATE OR REPLACE FUNCTION place_order(
  p_student_id UUID,
  p_bundle_id UUID,
  p_quantity INT,
  p_is_subscription BOOLEAN,
  p_delivery_address TEXT,
  p_delivery_time TEXT,
  p_delivery_date TEXT,
  p_notes TEXT,
  p_pickup_pin TEXT,
  p_custom_items JSONB,
  p_delivery_phone TEXT,
  p_total_amount NUMERIC,
  p_delivery_fee NUMERIC,
  p_use_points BOOLEAN,
  p_points_to_use INT,
  p_points_earned INT
) RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID := NULL;
  v_order_id UUID;
  v_parsed_date DATE := NULL;
  v_current_balance INT := 0;
BEGIN
  -- Parse date
  IF p_delivery_date IS NOT NULL AND p_delivery_date != '' THEN
    v_parsed_date := p_delivery_date::DATE;
  END IF;

  -- 1. Create Subscription if requested
  IF p_is_subscription THEN
    INSERT INTO subscriptions (
      student_id,
      bundle_id,
      frequency,
      quantity,
      delivery_address,
      delivery_time,
      status,
      next_delivery_date,
      duration_months,
      deliveries_made,
      custom_items
    ) VALUES (
      p_student_id,
      p_bundle_id,
      'monthly',
      p_quantity,
      p_delivery_address,
      p_delivery_time,
      'active',
      COALESCE(v_parsed_date, CURRENT_DATE),
      3,
      0,
      p_custom_items
    ) RETURNING id INTO v_subscription_id;
  END IF;

  -- 2. Create Order
  INSERT INTO orders (
    student_id,
    bundle_id,
    subscription_id,
    quantity,
    total_amount,
    delivery_fee,
    delivery_address,
    delivery_date,
    delivery_time,
    notes,
    status,
    pickup_pin,
    custom_items,
    delivery_phone
  ) VALUES (
    p_student_id,
    p_bundle_id,
    v_subscription_id,
    p_quantity,
    p_total_amount,
    p_delivery_fee,
    p_delivery_address,
    v_parsed_date,
    p_delivery_time,
    p_notes,
    'pending',
    p_pickup_pin,
    p_custom_items,
    p_delivery_phone
  ) RETURNING id INTO v_order_id;

  -- 3. Create Transaction
  INSERT INTO transactions (
    order_id,
    student_id,
    amount,
    status
  ) VALUES (
    v_order_id,
    p_student_id,
    p_total_amount,
    'pending'
  );

  -- Get current loyalty points balance
  SELECT balance INTO v_current_balance 
  FROM loyalty_points 
  WHERE student_id = p_student_id 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  -- 4. Award Loyalty Points
  IF p_points_earned > 0 THEN
    v_current_balance := v_current_balance + p_points_earned;
    INSERT INTO loyalty_points (
      student_id,
      points,
      balance,
      type,
      reference
    ) VALUES (
      p_student_id,
      p_points_earned,
      v_current_balance,
      'earned',
      'Order ' || substring(v_order_id::text from 1 for 8)
    );
  END IF;

  -- 5. Deduct Loyalty Points
  IF p_use_points AND p_points_to_use > 0 THEN
    v_current_balance := v_current_balance - p_points_to_use;
    INSERT INTO loyalty_points (
      student_id,
      points,
      balance,
      type,
      reference
    ) VALUES (
      p_student_id,
      -p_points_to_use,
      v_current_balance,
      'redeemed',
      'Order ' || substring(v_order_id::text from 1 for 8)
    );
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
