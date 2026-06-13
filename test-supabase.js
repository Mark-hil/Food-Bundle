import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      bundle:bundles(name),
      profiles(full_name, email, phone, student_id)
    `)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}

run();
