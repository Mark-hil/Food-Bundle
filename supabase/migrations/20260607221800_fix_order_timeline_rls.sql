-- Allow students to insert timeline entries for their own orders
CREATE POLICY "Users insert own order timeline" ON order_timeline FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.student_id = auth.uid())
  );

-- Update the trigger functions to bypass RLS (Security Definer) so the database can automate this securely:
CREATE OR REPLACE FUNCTION insert_order_timeline_on_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_timeline (order_id, status, note)
  VALUES (NEW.id, 'pending', 'Order placed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION insert_order_timeline_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_timeline (order_id, status, note, created_by)
    VALUES (NEW.id, NEW.status, 'Status updated to ' || NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
