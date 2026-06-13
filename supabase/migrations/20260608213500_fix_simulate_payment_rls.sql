-- Create a function to automatically update the order status when a transaction succeeds
CREATE OR REPLACE FUNCTION public.handle_successful_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND OLD.status IS DISTINCT FROM 'success' THEN
    UPDATE public.orders
    SET status = 'confirmed'
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a transaction is updated
DROP TRIGGER IF EXISTS on_transaction_success ON public.transactions;
CREATE TRIGGER on_transaction_success
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_successful_transaction();
