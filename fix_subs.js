import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  const { data: subs, error: subErr } = await supabase.from('subscriptions').select('id, deliveries_made');
  console.log('Subs:', subs);

  const { data: orders, error: ordErr } = await supabase.from('orders').select('id, subscription_id, delivery_date, status');
  console.log('Orders:', orders);

  for (const sub of subs) {
    // Find the latest pending order for this sub
    const pendingOrder = orders.find(o => o.subscription_id === sub.id && o.status === 'pending');
    if (pendingOrder && pendingOrder.delivery_date) {
      console.log(`Fixing sub ${sub.id} to date ${pendingOrder.delivery_date}`);
      const { error } = await supabase.from('subscriptions').update({ next_delivery_date: pendingOrder.delivery_date }).eq('id', sub.id);
      if (error) console.error(error);
    }
  }
}
fix();
