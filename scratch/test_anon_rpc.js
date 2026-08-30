import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Anonymous client (public anon key)
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testRpc() {
  const orderId = '06cf249f-fc42-43d8-9e7d-f83553458366';
  console.log('Testing RPC as ANON user on guest order:', orderId);

  const { data, error } = await supabase.rpc('simulate_payment_success', {
    p_order_id: orderId,
    p_is_guest: true
  });

  console.log('RPC result:', data, 'Error:', error);

  const { data: updated } = await supabase.from('guest_orders').select('id, status, payment_status').eq('id', orderId).single();
  console.log('Order status after RPC:', updated);
}

testRpc();
