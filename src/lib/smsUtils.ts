import { supabase } from './supabase';

export interface OrderSmsRecord {
  id: string;
  status?: string;
  delivery_phone?: string | null;
  phone?: string | null;
  student_id?: string | null;
  pickup_pin?: string | null;
}

/**
 * Triggers the `send-sms` Supabase Edge Function in the background.
 * Non-blocking: any SMS error is caught and logged so it never interrupts
 * checkout, payment verification, or order status updates.
 */
export async function notifyOrderSms(params: {
  type: 'INSERT' | 'UPDATE';
  isGuest?: boolean;
  record: OrderSmsRecord;
  oldStatus?: string;
}): Promise<void> {
  try {
    await supabase.functions.invoke('send-sms', {
      body: {
        type: params.type,
        table: params.isGuest ? 'guest_orders' : 'orders',
        record: params.record,
        old_record: params.oldStatus ? { status: params.oldStatus } : undefined,
      },
    });
  } catch (err) {
    console.warn('SMS notification skipped or failed:', err);
  }
}

