import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { name, email, message } = payload;

    if (!name || !email || !message) {
      throw new Error("Missing required fields: name, email, message");
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set in environment variables");
      throw new Error("Server configuration error: Email service unavailable");
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Food Bundle <noreply@food-bundle.com>',
        to: ['support@food-bundle.com'],
        reply_to: email,
        subject: `Support Request: ${name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; background-color: #f8fafc; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              .header { background-color: #0f172a; padding: 24px; text-align: center; }
              .header h2 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
              .content { padding: 32px; }
              .info-grid { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
              .info-row { margin-bottom: 12px; }
              .info-row:last-child { margin-bottom: 0; }
              .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
              .value { font-size: 15px; color: #0f172a; font-weight: 500; }
              .message-section { margin-top: 24px; }
              .message-box { background-color: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px; }
              .message-content { white-space: pre-wrap; font-size: 15px; color: #334155; margin: 0; }
              .footer { background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; }
              .footer p { margin: 0; font-size: 12px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>New Support Request</h2>
              </div>
              <div class="content">
                <div class="info-grid">
                  <div class="info-row">
                    <div class="label">Customer Name</div>
                    <div class="value">${name}</div>
                  </div>
                  <div class="info-row">
                    <div class="label">Email Address</div>
                    <div class="value"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></div>
                  </div>
                </div>
                <div class="message-section">
                  <div class="label" style="color: #0f172a;">Message from Customer</div>
                  <div class="message-box">
                    <p class="message-content">${message}</p>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p>This message was sent securely via the Food Bundle Contact Form.<br>You can reply directly to this email to respond to the customer.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API Error:", data);
      throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-contact-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
