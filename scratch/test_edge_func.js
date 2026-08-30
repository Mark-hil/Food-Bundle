import dotenv from 'dotenv';
dotenv.config();

async function testPaystackFunction() {
  const apiUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/paystack-payment`;
  console.log("Calling Edge Function:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        amount: 50,
        orderId: '06cf249f-fc42-43d8-9e7d-f83553458366',
        isGuest: true,
      }),
    });

    console.log("Status Code:", response.status);
    const data = await response.text();
    console.log("Response Body:", data);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testPaystackFunction();
