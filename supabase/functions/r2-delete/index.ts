/**
 * r2-delete — Deletes objects from Cloudflare R2 using AWS Signature V4.
 *
 * Expects: { keys: string[] }
 * Returns: { deleted: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY = Deno.env.get('R2_ACCESS_KEY')!;
const R2_SECRET_KEY = Deno.env.get('R2_SECRET_KEY')!;
const R2_BUCKET     = Deno.env.get('R2_BUCKET') || 'photoproject';
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REGION        = 'auto';
const SERVICE       = 's3';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ---- crypto helpers (same as r2-presign) ----

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
}

async function sha256Hex(data: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)));
}

async function getSigningKey(date: string): Promise<ArrayBuffer> {
  let key: ArrayBuffer = new TextEncoder().encode(`AWS4${R2_SECRET_KEY}`).buffer;
  for (const part of [date, REGION, SERVICE, 'aws4_request']) {
    key = await hmacSha256(key, part);
  }
  return key;
}

function encodeURIComponentRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// ---- signed DELETE request ----

async function deleteR2Object(objectKey: string): Promise<boolean> {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const amzDate   = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const credential = `${R2_ACCESS_KEY}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  const canonicalUri = `/${R2_BUCKET}/${encodeURIComponentRFC3986(objectKey).replace(/%2F/g, '/')}`;

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'DELETE',
    canonicalUri,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${REGION}/${SERVICE}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(dateStamp);
  const signature  = hex(await hmacSha256(signingKey, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'DELETE',
    headers: {
      'Host': host,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': amzDate,
      'Authorization': authorization,
    },
  });

  return res.ok || res.status === 204 || res.status === 404; // 404 = already gone
}

// ---- handler ----

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify the JWT to get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { keys } = (await req.json()) as { keys: string[] };
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return new Response(
        JSON.stringify({ error: 'keys array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Limit batch size to prevent abuse
    if (keys.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Maximum 100 keys per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Delete each key from R2
    let deleted = 0;
    for (const key of keys) {
      // Basic validation: only allow keys that start with "submissions/"
      if (typeof key !== 'string' || !key.startsWith('submissions/')) continue;
      const ok = await deleteR2Object(key);
      if (ok) deleted++;
    }

    return new Response(
      JSON.stringify({ deleted }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('r2-delete error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to delete objects' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
