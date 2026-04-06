/**
 * r2-presign — Generates presigned PUT URLs for Cloudflare R2.
 *
 * AWS Signature V4 implemented natively (no external SDK needed).
 */

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY = Deno.env.get('R2_ACCESS_KEY')!;
const R2_SECRET_KEY = Deno.env.get('R2_SECRET_KEY')!;
const R2_BUCKET     = Deno.env.get('R2_BUCKET') || 'photoproject';
const REGION        = 'auto';
const SERVICE       = 's3';
const EXPIRES       = 900; // 15 minutes

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://fokusaward.com';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ---- helpers ----

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

// ---- presign ----

async function presignPutUrl(key: string, contentType: string): Promise<string> {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);           // YYYYMMDD
  const amzDate   = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); // YYYYMMDDTHHmmssZ
  const credential = `${R2_ACCESS_KEY}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  const canonicalUri = `/${R2_BUCKET}/${encodeURIComponentRFC3986(key).replace(/%2F/g, '/')}`;

  // Query-string params (presigned URL style — sorted)
  const params: Record<string, string> = {
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':   credential,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       String(EXPIRES),
    'X-Amz-SignedHeaders': 'content-type;host',
  };

  const sortedQS = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponentRFC3986(k)}=${encodeURIComponentRFC3986(params[k])}`)
    .join('&');

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    sortedQS,
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

  return `https://${host}${canonicalUri}?${sortedQS}&X-Amz-Signature=${signature}`;
}

// ---- handler ----

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { filename, contentType } = (await req.json()) as {
      filename: string;
      contentType: string;
    };

    if (!filename || !contentType) {
      return new Response(
        JSON.stringify({ error: 'filename and contentType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `submissions/${crypto.randomUUID()}-${safe}`;

    const uploadUrl = await presignPutUrl(key, contentType);

    return new Response(
      JSON.stringify({ uploadUrl, key }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('r2-presign error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to generate presigned URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
