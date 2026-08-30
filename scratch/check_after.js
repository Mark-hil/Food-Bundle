import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: gorders } = await supabase.from('guest_orders').select('id, status, payment_status, created_at').eq('id', '9ff69558-a60b-4551-86ed-8568cda5f1e2');
  console.log('Guest order after RPC:', gorders);
}

run();
