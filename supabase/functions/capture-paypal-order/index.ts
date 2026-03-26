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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const orderId = body.orderId as string;
    const userId = body.userId as string;

    // New flow fields (tier-based credits)
    const tierId = body.tierId as string | undefined;
    const editionId = body.editionId as string | undefined;

    // Legacy flow fields
    const submissionId = body.submissionId as string | undefined;

    const accessToken = await getAccessToken();

    // First check the order status before capturing
    const checkRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const orderData = await checkRes.json() as any;

    // If already completed, return success without re-capturing
    if (orderData.status === 'COMPLETED') {
      return new Response(
        JSON.stringify({ success: true, captureId: 'already_completed' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Order must be APPROVED to capture
    if (orderData.status !== 'APPROVED') {
      return new Response(
        JSON.stringify({ error: `Order not approved. Current status: ${orderData.status}`, details: orderData }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

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

    // Handle duplicate capture
    if (!captureRes.ok && captureData?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
      return new Response(
        JSON.stringify({ success: true, captureId: 'already_captured' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (captureData.status !== 'COMPLETED') {
      // Extract a meaningful error from PayPal's response
      const ppError = captureData?.details?.[0]?.issue
        || captureData?.message
        || `Capture status: ${captureData.status || 'unknown'}`;
      return new Response(
        JSON.stringify({ error: `Payment not completed: ${ppError}`, details: captureData }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Extract capture details
    const capture = captureData.purchase_units[0].payments.captures[0];
    const payerEmail = captureData.payer?.email_address;

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create payment record
    await supabase.from('payments').insert({
      submission_id: submissionId || null,
      user_id: userId,
      amount: parseFloat(capture.amount.value),
      currency: capture.amount.currency_code,
      status: 'completed',
      paypal_order_id: orderId,
      paypal_capture_id: capture.id,
      paypal_payer_email: payerEmail,
      tier_id: tierId || null,
      paid_at: new Date().toISOString(),
    });

    // New flow: create user credits from tier
    if (tierId && editionId) {
      const { data: tier } = await supabase
        .from('pricing_tiers')
        .select('photo_credits')
        .eq('id', tierId)
        .single();

      // Count how many paid categories exist for this edition to set submission limit
      const { count: paidCategoryCount } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('edition_id', editionId)
        .gt('price', 0);

      if (tier) {
        await supabase.from('user_credits').upsert(
          {
            user_id: userId,
            edition_id: editionId,
            tier_id: tierId,
            photo_credits: tier.photo_credits,
            submissions_remaining: paidCategoryCount || 1,
          },
          { onConflict: 'user_id,edition_id' }
        );
      }
    }

    // Legacy flow: update submission status
    if (submissionId) {
      await supabase
        .from('submissions')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', submissionId);
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'success',
      title: 'Payment Confirmed',
      message: tierId
        ? 'Your payment has been confirmed. Photo credits have been added to your account.'
        : 'Your submission has been received and payment confirmed.',
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
