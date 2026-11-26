import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentRequest {
  action?: "initialize" | "verify";
  email?: string;
  amount?: number;
  orderId?: string;
  reference?: string;
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const body: PaymentRequest = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    if (body.action === "verify") {
      if (!body.reference) {
        return new Response(
          JSON.stringify({ error: "Missing payment reference" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const verifyResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const verifyData = await verifyResponse.json();
      const isPaid =
        verifyResponse.ok &&
        verifyData?.status === true &&
        verifyData?.data?.status === "success";

      const resolvedOrderId = body.orderId || verifyData?.data?.metadata?.orderId;
      const verifiedReference = verifyData?.data?.reference || body.reference;

      // Authoritative server-side confirmation using service_role once Paystack confirms payment
      if (isPaid && supabaseAdmin && resolvedOrderId) {
        try {
          const { data: regOrder } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("id", resolvedOrderId)
            .maybeSingle();

          if (regOrder) {
            await Promise.all([
              supabaseAdmin
                .from("orders")
                .update({ status: "confirmed" })
                .eq("id", resolvedOrderId),
              supabaseAdmin
                .from("transactions")
                .update({ status: "success", payment_reference: verifiedReference })
                .eq("order_id", resolvedOrderId),
            ]);
          } else {
            await supabaseAdmin
              .from("guest_orders")
              .update({
                status: "confirmed",
                payment_status: "success",
                payment_reference: verifiedReference,
              })
              .eq("id", resolvedOrderId);
          }
        } catch (dbErr) {
          console.error("Error updating order after verification:", dbErr);
        }
      }

      return new Response(
        JSON.stringify({
          verified: isPaid,
          status: verifyData?.data?.status || "failed",
          reference: verifiedReference,
          amount: verifyData?.data?.amount ? verifyData.data.amount / 100 : undefined,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { email, amount, orderId } = body;

    if (!email || !amount || !orderId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Read authoritative total_amount from DB when service_role is available to prevent price tampering
    let authoritativeAmount = Number(amount);
    if (supabaseAdmin) {
      try {
        const [{ data: regOrder }, { data: guestOrder }] = await Promise.all([
          supabaseAdmin.from("orders").select("total_amount").eq("id", orderId).maybeSingle(),
          supabaseAdmin.from("guest_orders").select("total_amount").eq("id", orderId).maybeSingle(),
        ]);
        const dbAmount = Number(regOrder?.total_amount ?? guestOrder?.total_amount ?? 0);
        if (dbAmount > 0) {
          authoritativeAmount = dbAmount;
        }
      } catch (lookupErr) {
        console.warn("Could not look up DB order amount, using client amount:", lookupErr);
      }
    }

    const amountInKobo = Math.round(authoritativeAmount * 100);
    const reference = `ORDER-${orderId}-${Date.now()}`;

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          currency: "GHS",
          channels: ["mobile_money", "card"],
          reference,
          callback_url: `${req.headers.get("origin")}/payment/success?order=${orderId}`,
          metadata: {
            orderId,
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      throw new Error(paystackData.message || "Payment initialization failed");
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Payment error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Payment processing failed",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
