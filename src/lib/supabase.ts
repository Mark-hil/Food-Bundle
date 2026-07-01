import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  student_id?: string;
  role: 'student' | 'admin';
  created_at: string;
  updated_at: string;
};

export type CustomizationOption = {
  category: string;
  options: string[];
  required: boolean;
  maxSelections: number;
};

export type Bundle = {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  items: string[];
  available: boolean;
  delivery_days: string[];
  is_customizable?: boolean;
  customization_options?: CustomizationOption[];
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  student_id: string;
  bundle_id: string;
  quantity: number;
  total_amount: number;
  delivery_fee: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  delivery_address: string;
  delivery_date?: string;
  delivery_time?: string;
  notes?: string;
  pickup_pin?: string;
  custom_items?: string[];
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  order_id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  status: 'pending' | 'success' | 'failed';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
