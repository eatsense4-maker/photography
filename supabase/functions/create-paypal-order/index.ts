import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYPAL_API = Deno.env.get('PAYPAL_API_URL') || 'https://api-m.paypal.com';
const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!;
const PAYPAL_SECRET = Deno.env.get('PAYPAL_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('create-paypal-order init:', {
  api: PAYPAL_API,
  clientIdSet: !!PAYPAL_CLIENT_ID,
  secretSet: !!PAYPAL_SECRET,
});

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let amount: number;
    let referenceId: string;

    if (body.tierId && body.editionId) {
      // New flow: tier-based pricing — validate from DB
      const tierId = body.tierId as string;
      const editionId = body.editionId as string;
      const categoryIds = (body.categoryIds || []) as string[];

      // Look up tier in DB
      const { data: tier, error: tierErr } = await supabase
        .from('pricing_tiers')
        .select('id, price, is_bundle, edition_id')
        .eq('id', tierId)
        .eq('edition_id', editionId)
        .single();

      if (tierErr || !tier) {
        return new Response(JSON.stringify({ error: 'Invalid pricing tier' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      if (tier.is_bundle) {
        amount = parseFloat(tier.price);
      } else {
        // Count paid categories from DB to prevent client manipulation
        const { count } = await supabase
          .from('categories')
          .select('*', { count: 'exact', head: true })
          .in('id', categoryIds)
          .gt('price', 0);

        const paidCount = count || 0;
        if (paidCount === 0) {
          return new Response(JSON.stringify({ error: 'No paid categories selected' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        amount = parseFloat(tier.price) * paidCount;
      }

      referenceId = `tier_${tierId}`;
    } else {
      // Legacy flow: amount passed directly (for backward compatibility)
      amount = body.amount as number;
      referenceId = (body.submissionId as string) || 'legacy';
    }

    const currency = (body.currency as string) || 'EUR';
    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        application_context: {
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
        purchase_units: [
          {
            reference_id: referenceId,
            description: 'Fokus Award Competition Entry Fee',
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: currency,
                  value: amount.toFixed(2),
                },
              },
            },
            items: [
              {
                name: 'Competition Entry Fee',
                unit_amount: {
                  currency_code: currency,
                  value: amount.toFixed(2),
                },
                quantity: '1',
                category: 'DIGITAL_GOODS',
              },
            ],
          },
        ],
      }),
    });

    if (!orderRes.ok) {
      const errBody = await orderRes.text();
      console.error('PayPal create order failed:', orderRes.status, errBody);
      return new Response(
        JSON.stringify({ error: `PayPal API error (${orderRes.status})`, details: errBody }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const order = await orderRes.json() as { id: string };

    return new Response(JSON.stringify({ orderId: order.id }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('create-paypal-order error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create PayPal order' }),
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
