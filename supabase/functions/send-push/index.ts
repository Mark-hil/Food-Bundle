import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get("VITE_VAPID_PUBLIC_KEY") || Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@foodbundle.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

serve(async (req) => {
  try {
    const payload = await req.json();

    if (payload.table !== 'orders' || payload.type !== 'INSERT') {
      return new Response("Not a new order webhook", { status: 200 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("VAPID keys are missing from environment variables.");
      return new Response("Server configuration error", { status: 500 });
    }

    const { record } = payload;
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch all admin push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('admin_push_subscriptions')
      .select('subscription');

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response("No admin subscriptions found", { status: 200 });
    }

    const pushPayload = JSON.stringify({
      title: 'New Order Received! 🍔',
      body: `Order #${record.id.slice(0, 8)} has been placed for GH₵${record.total_amount}.`,
      url: '/admin/orders',
    });

    // Send push to all subscriptions
    const sendPromises = subscriptions.map((sub: any) => {
      return webpush.sendNotification(sub.subscription, pushPayload)
        .catch((err: any) => {
          console.error("Error sending push notification to a subscription:", err);
          // If subscription is invalid/expired, we could delete it here
        });
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
