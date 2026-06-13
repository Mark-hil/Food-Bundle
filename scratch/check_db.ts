import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  console.log("Checking latest orders...");
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (oErr) console.error("orders err", oErr);
  else console.log("Orders:", orders);

  console.log("Checking latest guest orders...");
  const { data: gorders, error: goErr } = await supabase
    .from('guest_orders')
    .select('id, status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (goErr) console.error("guest orders err", goErr);
  else console.log("Guest Orders:", gorders);

  console.log("Checking latest transactions...");
  const { data: trans, error: tErr } = await supabase
    .from('transactions')
    .select('id, order_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (tErr) console.error("transactions err", tErr);
  else console.log("Transactions:", trans);
}
check();
