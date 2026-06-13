import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  console.log("Fetching pending orders...");
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (oErr) console.error("orders err", oErr);
  else console.log("Pending Orders:", orders);

  if (orders && orders.length > 0) {
    const orderId = orders[0].id;
    console.log("Calling RPC on", orderId);
    const { error: rpcErr } = await supabase.rpc('simulate_payment_success', {
      p_order_id: orderId,
      p_is_guest: false
    });
    if (rpcErr) console.error("RPC Error:", rpcErr);
    else console.log("RPC Success!");

    const { data: updated } = await supabase.from('orders').select('status').eq('id', orderId).single();
    console.log("Updated status:", updated);
  }
}
check();
