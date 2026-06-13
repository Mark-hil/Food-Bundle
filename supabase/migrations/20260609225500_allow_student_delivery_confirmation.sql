-- Allow students to update order status to delivered if currently ready
CREATE POLICY "Students can confirm delivery"
  ON orders FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'ready')
  WITH CHECK (student_id = auth.uid() AND status = 'delivered');
