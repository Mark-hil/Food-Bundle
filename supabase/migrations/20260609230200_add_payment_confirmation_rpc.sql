-- Create a secure RPC function to handle payment success
CREATE OR REPLACE FUNCTION simulate_payment_success(p_order_id UUID, p_is_guest BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_is_guest THEN
    -- For guest orders
    UPDATE guest_orders
    SET 
      payment_status = 'success',
      payment_reference = 'SIM-' || extract(epoch from now())::text,
      status = 'confirmed'
    WHERE id = p_order_id;
  ELSE
    -- For registered user orders
    UPDATE transactions
    SET 
      status = 'success',
      payment_reference = 'SIM-' || extract(epoch from now())::text
    WHERE order_id = p_order_id;

    UPDATE orders
    SET status = 'confirmed'
    WHERE id = p_order_id;
  END IF;
END;
$$;
