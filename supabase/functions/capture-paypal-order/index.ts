import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYPAL_API = Deno.env.get('PAYPAL_API_URL') || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!;
const PAYPAL_SECRET = Deno.env.get('PAYPAL_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`);
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { orderId, submissionId, userId } = await req.json() as { orderId: string; submissionId: string; userId: string };

    const accessToken = await getAccessToken();

    // Capture the payment
    const captureRes = await fetch(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const captureData = await captureRes.json() as any;

    if (captureData.status !== 'COMPLETED') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', details: captureData }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Extract capture details
    const capture = captureData.purchase_units[0].payments.captures[0];
    const payerEmail = captureData.payer?.email_address;

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Update payment record
    await supabase.from('payments').upsert({
      submission_id: submissionId,
      user_id: userId,
      amount: parseFloat(capture.amount.value),
      currency: capture.amount.currency_code,
      status: 'completed',
      paypal_order_id: orderId,
      paypal_capture_id: capture.id,
      paypal_payer_email: payerEmail,
      paid_at: new Date().toISOString(),
    });

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', submissionId);

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'success',
      title: 'Payment Confirmed',
      message: 'Your submission has been received and payment confirmed.',
      link: `/dashboard/submissions`,
    });

    return new Response(
      JSON.stringify({ success: true, captureId: capture.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to capture payment' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
