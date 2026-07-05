-- Migration: Fix order_timeline foreign key constraint on delete
-- Purpose: Allows users/admins to be deleted by setting their reference to NULL in the order timeline history instead of blocking the deletion.

ALTER TABLE order_timeline 
  DROP CONSTRAINT IF EXISTS order_timeline_created_by_fkey;

ALTER TABLE order_timeline 
  ADD CONSTRAINT order_timeline_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;
