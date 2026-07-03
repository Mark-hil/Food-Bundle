DO $$
BEGIN
    -- Check if orders table is in supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    -- Check if guest_orders table is in supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'guest_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE guest_orders;
    END IF;
END $$;
