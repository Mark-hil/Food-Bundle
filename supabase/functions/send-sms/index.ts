import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_API_KEY = Deno.env.get("ARKESEL_API_KEY");
const SENDER_ID = Deno.env.get("ARKESEL_SENDER_ID") || "FoodBundle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatGhanaPhone(rawPhone: string): string {
  let formatted = rawPhone.replace(/[^0-9+]/g, "");
  if (formatted.startsWith("0")) {
    formatted = "233" + formatted.slice(1);
  } else if (formatted.startsWith("+")) {
    formatted = formatted.slice(1);
  }
  return formatted;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received SMS payload:", payload);

    if (payload.table && payload.table !== "orders" && payload.table !== "guest_orders") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Not an orders or guest_orders payload" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, record, old_record } = payload;
    if (!record || !record.id) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Missing order record" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let phone: string | null = record.delivery_phone || record.phone || null;

    // Fallback: look up student's profile phone if not directly on the order record
    if (!phone && record.student_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("phone")
            .eq("id", record.student_id)
            .maybeSingle();
          if (profile?.phone) {
            phone = profile.phone;
          }
        } catch (lookupErr) {
          console.warn("Could not look up profile phone:", lookupErr);
        }
      }
    }

    if (!phone) {
      console.log("No phone number associated with this order.");
      return new Response(
        JSON.stringify({ skipped: true, reason: "No phone number to send to" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatGhanaPhone(phone);
    const shortId = String(record.id).slice(0, 8).toUpperCase();
    let message = "";

    if (type === "INSERT") {
      message = `Hi! Your FoodBundle order #${shortId} has been received and is pending payment confirmation.`;
    } else if (type === "UPDATE") {
      if (!old_record || record.status !== old_record?.status) {
        if (record.status === "confirmed") {
          const pinNote = record.pickup_pin ? ` Your Pickup PIN is ${record.pickup_pin}.` : "";
          message = `Your FoodBundle order #${shortId} has been confirmed!${pinNote} We will start preparing it shortly.`;
        } else if (record.status === "preparing") {
          message = `Great news! We have started preparing your FoodBundle order #${shortId}.`;
        } else if (record.status === "ready") {
          message = `Your FoodBundle order #${shortId} is packed and ready for dispatch!`;
        } else if (record.status === "out_for_delivery") {
          const pinText = record.pickup_pin ? ` Please have your 4-digit Pickup PIN ready: ${record.pickup_pin}` : "";
          message = `Your FoodBundle order #${shortId} is OUT FOR DELIVERY! The rider is on their way.${pinText}`;
        } else if (record.status === "delivered") {
          message = `Your FoodBundle order #${shortId} has been delivered. Thank you for choosing FoodBundle!`;
        }
      }
    }

    if (!message) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No relevant status change" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ARKESEL_API_KEY) {
      console.error("ARKESEL_API_KEY is missing from environment variables.");
      return new Response(
        JSON.stringify({ error: "ARKESEL_API_KEY not configured in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        message,
        recipients: [formattedPhone],
      }),
    });

    const result = await response.json();
    console.log("Arkesel response (Customer):", result);

    if (!response.ok) {
      throw new Error(`Arkesel API error (Customer): ${JSON.stringify(result)}`);
    }

    // --- ADMIN NOTIFICATION SECTION ---
    if (type === "INSERT" || (type === "UPDATE" && record.status === "confirmed")) {
      const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE");
      if (ADMIN_PHONE) {
        const formattedAdminPhone = formatGhanaPhone(ADMIN_PHONE);
        const adminMessage =
          type === "INSERT"
            ? `New FoodBundle Order #${shortId} placed! Check the admin dashboard.`
            : `FoodBundle Order #${shortId} is now PAID & CONFIRMED! Ready for packing.`;

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
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "SMS processing complete" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error processing SMS:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "SMS error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
