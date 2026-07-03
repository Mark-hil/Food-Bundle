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
        if (record.status === 'confirmed') {
          message = `Your order #${record.id.slice(0, 8)} has been confirmed! We will start preparing it shortly.`;
        } else if (record.status === 'preparing') {
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

    // Send via Arkesel V2 API to Customer
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
    console.log("Arkesel response (Customer):", result);

    if (!response.ok) {
      throw new Error(`Arkesel API error (Customer): ${JSON.stringify(result)}`);
    }

    // --- ADMIN NOTIFICATION SECTION ---
    if (type === "INSERT") {
      const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE");
      if (ADMIN_PHONE) {
        // Format Admin Phone
        let formattedAdminPhone = ADMIN_PHONE.replace(/[^0-9+]/g, '');
        if (formattedAdminPhone.startsWith('0')) {
          formattedAdminPhone = '233' + formattedAdminPhone.slice(1);
        } else if (formattedAdminPhone.startsWith('+')) {
          formattedAdminPhone = formattedAdminPhone.slice(1);
        }

        const adminMessage = `🚨 New FoodBundle Order #${record.id.slice(0, 8)}! Please check the admin dashboard.`;
        
        try {
          const adminResponse = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
            method: "POST",
            headers: {
              "api-key": ARKESEL_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: SENDER_ID,
              message: adminMessage,
              recipients: [formattedAdminPhone],
            }),
          });
          const adminResult = await adminResponse.json();
          console.log("Arkesel response (Admin):", adminResult);
        } catch (adminError) {
          console.error("Failed to send admin SMS:", adminError);
          // Don't throw error to avoid failing the customer notification if admin notification fails.
        }
      } else {
         console.log("ADMIN_PHONE environment variable is not set. Admin SMS skipped.");
      }
    }
    // ----------------------------------

    return new Response(JSON.stringify({ success: true, message: "SMS processing complete" }), {
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
