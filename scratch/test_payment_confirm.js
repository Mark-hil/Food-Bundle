import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('--- Checking latest orders ---');
  const { data: orders, error: oErr } = await supabase.from('orders').select('id, status, created_at').order('created_at', { ascending: false }).limit(3);
  console.log('Orders:', orders, 'Error:', oErr);

  console.log('--- Checking latest guest orders ---');
  const { data: gorders, error: gErr } = await supabase.from('guest_orders').select('id, status, payment_status, created_at').order('created_at', { ascending: false }).limit(3);
  console.log('Guest orders:', gorders, 'Error:', gErr);

  if (gorders && gorders.length > 0) {
    const testId = gorders[0].id;
    console.log('Testing simulate_payment_success on guest order:', testId);
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('simulate_payment_success', {
      p_order_id: testId,
      p_is_guest: true
    });
    console.log('RPC result:', rpcRes, 'Error:', rpcErr);
  }
}

run();
