import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ARKESEL_API_KEY = Deno.env.get("ARKESEL_API_KEY");
const SENDER_ID = Deno.env.get("ARKESEL_SENDER_ID") || "FoodBundle";

serve(async (req) => {
  try {
    // Webhook payload from Supabase
    const payload = await req.json();
    console.log("Received webhook payload:", payload);

    if (payload.table !== 'orders') {
      return new Response("Not an orders table webhook", { status: 200 });
    }

    const { type, record, old_record } = payload;
    let message = "";
    const phone = record.delivery_phone || null;

    if (!phone) {
      console.log("No phone number associated with this order.");
      return new Response("No phone number to send to", { status: 200 });
    }

    // Format phone number for Arkesel (requires international format e.g. 23324...)
    let formattedPhone = phone.replace(/[^0-9+]/g, ''); // Remove spaces/dashes
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '233' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.slice(1);
    }

    if (type === "INSERT") {
      // New Order
      message = `Hi! Your FoodBundle order #${record.id.slice(0, 8)} has been received and is pending confirmation.`;
    } else if (type === "UPDATE") {
      // Status change
      if (record.status !== old_record?.status) {
        if (record.status === 'preparing') {
          message = `Great news! We have started preparing your order #${record.id.slice(0, 8)}.`;
        } else if (record.status === 'ready') {
          message = `Your order #${record.id.slice(0, 8)} is out for delivery! The rider will call this number when they arrive.`;
        } else if (record.status === 'delivered') {
          message = `Your order #${record.id.slice(0, 8)} has been delivered. Enjoy your meal!`;
        }
      }
    }

    if (!message) {
      return new Response("No relevant status change", { status: 200 });
    }

    if (!ARKESEL_API_KEY) {
      console.error("ARKESEL_API_KEY is missing from environment variables.");
      return new Response("Server configuration error", { status: 500 });
    }

    // Send via Arkesel V2 API
    const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": ARKESEL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: SENDER_ID,
        message: message,
        recipients: [formattedPhone],
      }),
    });

    const result = await response.json();
    console.log("Arkesel response:", result);

    if (!response.ok) {
      throw new Error(`Arkesel API error: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ success: true, message: "SMS sent successfully" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
