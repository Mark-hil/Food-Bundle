import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const { data: orders } = await supabase.from('orders').select('id, status, created_at').order('created_at', { ascending: false }).limit(3);
  console.log("Latest Orders:", orders);

  const { data: gorders } = await supabase.from('guest_orders').select('id, status, payment_status, created_at').order('created_at', { ascending: false }).limit(3);
  console.log("Latest Guest Orders:", gorders);
}
check();
