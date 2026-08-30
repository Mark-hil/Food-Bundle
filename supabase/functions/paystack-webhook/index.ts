import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as crypto from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

function verifySignature(bodyText: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac('sha512', secret).update(bodyText).digest('hex');
  return hash === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const paystackSignature = req.headers.get('x-paystack-signature');
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY is not set.");
      return new Response("Server error", { status: 500, headers: corsHeaders });
    }

    if (!paystackSignature) {
      return new Response("Missing signature", { status: 400, headers: corsHeaders });
    }

    // We need the raw body text for signature verification
    const bodyText = await req.text();
    
    // Verify that the request is actually from Paystack
    const isValid = verifySignature(bodyText, paystackSignature, paystackSecretKey);
    
    if (!isValid) {
      console.error("Invalid Paystack signature. Mismatch between generated hash and x-paystack-signature.");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const payload = JSON.parse(bodyText);

    // Only handle successful charges
    if (payload.event === "charge.success") {
      const data = payload.data;
      const email = data.customer.email;
      const amount = data.amount / 100; // Paystack sends amount in kobo/cents
      const reference = data.reference;
      const currency = data.currency || "GHS";

      const orderId = data.metadata?.orderId;
      const shortOrderId = orderId ? orderId.slice(0, 8).toUpperCase() : reference.replace('ORDER-', '').split('-')[0].toUpperCase();

      // 1. Update Database Status to 'confirmed' using Supabase Admin Client
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseServiceKey && orderId) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);

          // Check if in registered orders
          const { data: regOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('id', orderId)
            .maybeSingle();

          if (regOrder) {
            await supabase
              .from('orders')
              .update({ status: 'confirmed' })
              .eq('id', orderId);

            await supabase
              .from('transactions')
              .update({ status: 'success', payment_reference: reference })
              .eq('order_id', orderId);
          } else {
            // Guest order
            await supabase
              .from('guest_orders')
              .update({
                status: 'confirmed',
                payment_status: 'success',
                payment_reference: reference,
              })
              .eq('id', orderId);
          }

          // Call RPC for any custom database triggers
          await supabase.rpc('simulate_payment_success', {
            p_order_id: orderId,
            p_is_guest: !regOrder,
          });
        } catch (dbErr) {
          console.error("Error updating order in database via webhook:", dbErr);
        }
      }

      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set - skipping email receipt");
        return new Response(JSON.stringify({ status: "success", message: "Order confirmed without email" }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Send the branded email receipt using Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Food Bundle <noreply@food-bundle.com>',
          to: [email],
          subject: `Payment Receipt for Order #${shortOrderId}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f5; padding: 20px; margin: 0; }
                .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
                .header { background-color: #16a34a; padding: 30px 20px; text-align: center; }
                .header h2 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
                .content { padding: 40px 30px; }
                .brand { text-align: center; margin-bottom: 30px; }
                .brand-icon { font-size: 36px; vertical-align: middle; margin-right: 8px; }
                .brand-text { font-size: 28px; font-weight: 800; color: #111827; vertical-align: middle; letter-spacing: -0.5px; }
                .message { text-align: center; font-size: 16px; color: #4b5563; margin-bottom: 40px; line-height: 1.5; }
                .receipt-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; width: 100%; }
                .footer { background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
                .footer p { margin: 0; font-size: 13px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>Payment Successful</h2>
                </div>
                <div class="content">
                  <div class="brand">
                    <span class="brand-icon">🛍️</span>
                    <span class="brand-text">Food Bundle</span>
                  </div>
                  <p class="message">Hi there, thank you for your payment! Your transaction was successful and your order is currently being processed.</p>
                  
                  <table class="receipt-card" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 24px 24px 12px 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="40%" style="font-size: 14px; color: #6b7280; font-weight: 500;">Order ID</td>
                            <td width="60%" style="font-size: 15px; color: #111827; font-weight: 600; text-align: right;">#${shortOrderId}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 24px 24px 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="40%" style="font-size: 14px; color: #6b7280; font-weight: 500;">Date</td>
                            <td width="60%" style="font-size: 15px; color: #111827; font-weight: 600; text-align: right;">${new Date().toLocaleDateString()}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 24px;">
                        <div style="border-top: 1px dashed #d1d5db;"></div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="50%" style="font-size: 16px; color: #111827; font-weight: 700;">Amount Paid</td>
                            <td width="50%" style="font-size: 22px; color: #16a34a; font-weight: 800; text-align: right;">${currency} ${amount.toFixed(2)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
                <div class="footer">
                  <p>Thank you for choosing Food Bundle!</p>
                  <p style="margin-top: 4px;">If you have any questions, simply reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Resend API Error:", errorData);
        // Still return 200 to Paystack so it doesn't retry
        return new Response("Webhook received, but email failed", { status: 200, headers: corsHeaders });
      }
    }

    // Always return a 200 response to Paystack to acknowledge receipt
    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
});
