import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('orders').select('id, notes, total_amount, created_at').order('created_at', { ascending: false }).limit(5);
  if (error) console.error(error);
  console.log(data);
}
main();
