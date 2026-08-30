import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const priorityList = ['alpha', 'beta', 'gamma'];

function sortBundlesWithAlphaBetaGamma(bundles) {
  return [...bundles].sort((a, b) => {
    const aName = (a.name || '').toLowerCase().trim();
    const bName = (b.name || '').toLowerCase().trim();

    const aIndex = priorityList.findIndex(p => aName === p || aName.startsWith(`${p} `) || aName.startsWith(`${p}-`) || aName.startsWith(`${p}_`) || aName === `${p} bundle` || aName.includes(p));
    const bIndex = priorityList.findIndex(p => bName === p || bName.startsWith(`${p} `) || bName.startsWith(`${p}-`) || bName.startsWith(`${p}_`) || bName === `${p} bundle` || bName.includes(p));

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    const aPrice = typeof a.price === 'string' ? parseFloat(a.price) || 0 : (a.price || 0);
    const bPrice = typeof b.price === 'string' ? parseFloat(b.price) || 0 : (b.price || 0);
    return bPrice - aPrice;
  });
}

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data } = await supabase.from('bundles').select('name, price');
  const sorted = sortBundlesWithAlphaBetaGamma(data || []);
  console.log('--- Top 6 Sorted Bundles ---');
  sorted.slice(0, 6).forEach((b, i) => console.log(`${i + 1}. ${b.name} - GH₵ ${b.price}`));
}

run();
