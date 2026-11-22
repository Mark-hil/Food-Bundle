import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

      return new Response(
        JSON.stringify({
          verified: isPaid,
          status: verifyData?.data?.status || "failed",
          reference: verifyData?.data?.reference || body.reference,
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

    const amountInKobo = Math.round(amount * 100);

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
          reference: `ORDER-${orderId}-${Date.now()}`,
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
