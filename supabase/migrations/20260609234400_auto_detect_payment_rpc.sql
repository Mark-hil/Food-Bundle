CREATE OR REPLACE FUNCTION simulate_payment_success(p_order_id UUID, p_is_guest BOOLEAN DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_registered BOOLEAN;
BEGIN
  -- Check if it exists in registered orders regardless of what the frontend says
  SELECT EXISTS(SELECT 1 FROM orders WHERE id = p_order_id) INTO v_is_registered;

  IF v_is_registered THEN
    -- For registered user orders
    UPDATE transactions
    SET 
      status = 'success',
      payment_reference = 'SIM-' || extract(epoch from now())::text
    WHERE order_id = p_order_id;

    UPDATE orders
    SET status = 'confirmed'
    WHERE id = p_order_id;
  ELSE
    -- For guest orders
    UPDATE guest_orders
    SET 
      payment_status = 'success',
      payment_reference = 'SIM-' || extract(epoch from now())::text,
      status = 'confirmed'
    WHERE id = p_order_id;
  END IF;
END;
$$;
