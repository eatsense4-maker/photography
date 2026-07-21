import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYPAL_API = Deno.env.get('PAYPAL_API_URL') || 'https://api-m.paypal.com';
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
  if (!res.ok) {
    const text = await res.text();
    console.error('PayPal auth failed:', res.status, text);
    throw new Error(`PayPal auth failed (${res.status})`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGIN') || 'https://fokusaward.com,https://www.fokusaward.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

serve(async (req) => {
  const allowOrigin = corsOrigin(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const orderId = body.orderId as string;
    const userId = body.userId as string;

    // New flow fields (tier-based credits, per category)
    const tierId = body.tierId as string | undefined;
    const editionId = body.editionId as string | undefined;
    // Categories the credit should be granted to. For non-bundle tiers
    // we expect exactly one entry; bundles can target many.
    const categoryIds = Array.isArray(body.categoryIds)
      ? (body.categoryIds as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];

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
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin } }
      );
    }

    // Order must be APPROVED to capture
    if (orderData.status !== 'APPROVED') {
      return new Response(
        JSON.stringify({ error: `Order not approved. Current status: ${orderData.status}`, details: orderData }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin },
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
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin } }
      );
    }

    if (!captureRes.ok || captureData.status !== 'COMPLETED') {
      const ppError = captureData?.details?.[0]?.issue
        || captureData?.message
        || `Capture status: ${captureData.status || 'unknown'}`;
      const ppDesc = captureData?.details?.[0]?.description || '';
      console.error('PayPal capture failed:', captureRes.status, JSON.stringify(captureData));
      return new Response(
        JSON.stringify({ error: `Payment not completed: ${ppError}`, description: ppDesc, details: captureData }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin },
        }
      );
    }

    // Extract capture details
    const capture = captureData.purchase_units[0].payments.captures[0];
    const payerEmail = captureData.payer?.email_address;

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Idempotency: if a completed payment row already exists for this
    // PayPal order, skip the side effects.
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('paypal_order_id', orderId)
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({ success: true, captureId: capture.id, idempotent: true }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin } }
      );
    }

    // Resolve which categories this payment grants credits to.
    let grantCategoryIds: string[] = [];
    let tierPhotoCredits = 0;
    let tierIsBundle = false;
    let expectedAmount: number | null = null;
    let expectedCurrency: string | null = null;

    if (tierId && editionId) {
      const { data: tier } = await supabase
        .from('pricing_tiers')
        .select('photo_credits, is_bundle, category_id, price, currency')
        .eq('id', tierId)
        .single();

      if (tier) {
        tierPhotoCredits = tier.photo_credits as number;
        tierIsBundle = !!tier.is_bundle;
        expectedCurrency = (tier.currency as string | null) || 'EUR';
      }

      if (tierIsBundle) {
        // Bundle: grant credits to every paid category in the edition.
        const { data: paidCats } = await supabase
          .from('categories')
          .select('id')
          .eq('edition_id', editionId)
          .gt('price', 0);
        grantCategoryIds = (paidCats || []).map((c: { id: string }) => c.id);
        expectedAmount = tier ? parseFloat(tier.price as unknown as string) : null;
      } else if (tier?.category_id) {
        // Tier locked to one category: ignore client list and grant only that one.
        grantCategoryIds = [tier.category_id as string];
        expectedAmount = tier ? parseFloat(tier.price as unknown as string) : null;
      } else {
        // Single-category tier: trust only paid categories from the request.
        const { data: validCats } = await supabase
          .from('categories')
          .select('id')
          .eq('edition_id', editionId)
          .in('id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000'])
          .gt('price', 0);
        grantCategoryIds = (validCats || []).map((c: { id: string }) => c.id);
        expectedAmount = tier ? parseFloat(tier.price as unknown as string) * grantCategoryIds.length : null;
      }
    }

    // Amount + currency cross-check: PayPal's reported value must match the
    // DB-computed total. If it doesn't, refund and refuse to grant credits.
    const capturedAmount = parseFloat(capture.amount.value);
    const capturedCurrency = String(capture.amount.currency_code).toUpperCase();

    if (expectedAmount !== null && expectedCurrency !== null) {
      const amountMismatch = Math.abs(capturedAmount - expectedAmount) > 0.01;
      const currencyMismatch = capturedCurrency !== expectedCurrency.toUpperCase();

      if (amountMismatch || currencyMismatch) {
        console.error('Payment amount/currency mismatch — refunding', {
          captured: { amount: capturedAmount, currency: capturedCurrency },
          expected: { amount: expectedAmount, currency: expectedCurrency },
          orderId,
          captureId: capture.id,
        });

        // Attempt automatic refund.
        try {
          await fetch(`${PAYPAL_API}/v2/payments/captures/${capture.id}/refund`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ note_to_payer: 'Order amount mismatch detected.' }),
          });
        } catch (refundErr) {
          console.error('Auto-refund failed:', refundErr);
        }

        // Record the bad payment for admin review.
        await supabase.from('payments').insert({
          submission_id: submissionId || null,
          user_id: userId,
          amount: capturedAmount,
          currency: capturedCurrency,
          status: 'refunded',
          paypal_order_id: orderId,
          paypal_capture_id: capture.id,
          paypal_payer_email: payerEmail,
          tier_id: tierId || null,
          refunded_at: new Date().toISOString(),
          metadata: { reason: 'amount_mismatch', expected: { amount: expectedAmount, currency: expectedCurrency } },
        });

        return new Response(
          JSON.stringify({ error: 'Payment amount mismatch. Refund initiated.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin } }
        );
      }
    }

    // Create payment record. Link to the (first) granted category so
    // refunds / audits can find the matching credit row.
    await supabase.from('payments').insert({
      submission_id: submissionId || null,
      user_id: userId,
      amount: capturedAmount,
      currency: capturedCurrency,
      status: 'completed',
      paypal_order_id: orderId,
      paypal_capture_id: capture.id,
      paypal_payer_email: payerEmail,
      tier_id: tierId || null,
      category_id: grantCategoryIds[0] || null,
      paid_at: new Date().toISOString(),
    });

    // Grant per-category credits via the SECURITY DEFINER RPC.
    const failedGrants: string[] = [];
    if (editionId && tierId && tierPhotoCredits > 0 && grantCategoryIds.length > 0) {
      for (const catId of grantCategoryIds) {
        const { error: grantErr } = await supabase.rpc('grant_photo_credits', {
          p_user_id: userId,
          p_edition_id: editionId,
          p_category_id: catId,
          p_tier_id: tierId,
          p_photo_credits: tierPhotoCredits,
        });
        if (grantErr) {
          console.error('grant_photo_credits failed', { catId, grantErr });
          failedGrants.push(catId);
        }
      }
    }

    // If the payment was captured but credits could not be granted, do
    // NOT report success — that would charge the buyer while leaving
    // them unable to submit. Flag the payment for admin reconciliation
    // and surface the failure to the client.
    if (failedGrants.length > 0) {
      await supabase
        .from('payments')
        .update({ metadata: { credit_grant_failed: true, failed_categories: failedGrants } })
        .eq('paypal_order_id', orderId);

      // Notify the user their payment went through and support is on it.
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'warning',
        title: 'Payment received — credits pending',
        message: 'Your payment was received but credits could not be applied automatically. Our team has been notified and will resolve this shortly.',
        link: `/dashboard/submissions`,
      });

      return new Response(
        JSON.stringify({
          error: 'Payment captured but photo credits could not be granted. Our team has been notified.',
          captureId: capture.id,
          creditGrantFailed: true,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin } }
      );
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
          'Access-Control-Allow-Origin': allowOrigin,
        },
      }
    );
  } catch (error) {
    console.error('capture-paypal-order error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to capture payment' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowOrigin,
        },
      }
    );
  }
});
