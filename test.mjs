import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, profiles!orders_driver_id_fkey(full_name)')
    .limit(1);
  console.log(error || data);
}
test();
