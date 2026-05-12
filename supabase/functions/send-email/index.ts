/**
 * send-email — locked-down email sender.
 *
 * Two modes:
 *   1. `kind: 'contact'` — public contact form. Anyone may call (CORS-gated).
 *      Hard-coded recipient = CONTACT_INBOX. Rate-limited per IP+email.
 *   2. `kind: 'template'` — internal-only. Caller must present `x-internal-key`
 *      that matches INTERNAL_API_KEY env. Used by other edge functions and
 *      the email-queue worker. Renders a server-side template; raw HTML from
 *      the caller is NEVER accepted.
 *
 * Resend is used as the upstream provider. If RESEND_API_KEY is unset, the
 * function logs and returns success (useful for local/dev).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderTemplate, type TemplateName } from './templates.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'FOKUS Award <noreply@fokusaward.com>';
const CONTACT_INBOX = Deno.env.get('CONTACT_INBOX') || 'info@fokusaward.com';
const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') || '';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGIN') || 'https://fokusaward.com,https://www.fokusaward.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin(req),
      'Vary': 'Origin',
    },
  });
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > RATE_LIMIT_MAX;
}

interface ContactPayload {
  kind: 'contact';
  name: string;
  email: string;
  subject?: string;
  message: string;
}

interface TemplatePayload {
  kind: 'template';
  template: TemplateName;
  to: string;
  data?: Record<string, unknown>;
}

type Payload = ContactPayload | TemplatePayload;

async function sendViaResend(to: string, subject: string, html: string, text: string, replyTo?: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log('send-email: RESEND_API_KEY missing, skipping send', { to, subject });
    return { ok: true, id: 'skipped' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${errText}` };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}

function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin(req),
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-internal-key',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return jsonResponse(req, { error: 'Invalid JSON' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (body.kind === 'contact') {
      const { name, email, subject, message } = body;
      if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
        return jsonResponse(req, { error: 'Invalid name' }, 400);
      }
      if (!isValidEmail(email)) {
        return jsonResponse(req, { error: 'Invalid email' }, 400);
      }
      if (typeof message !== 'string' || message.trim().length < 5 || message.length > 5000) {
        return jsonResponse(req, { error: 'Invalid message' }, 400);
      }
      const cleanSubject = (typeof subject === 'string' ? subject : '').slice(0, 200);

      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
      if (rateLimited(`${ip}:${email}`)) {
        return jsonResponse(req, { error: 'Too many requests. Please try again in a minute.' }, 429);
      }

      const { subject: rSubject, html, text } = renderTemplate('contact_message', {
        name,
        from_email: email,
        subject: cleanSubject,
        message,
      });

      const result = await sendViaResend(CONTACT_INBOX, rSubject, html, text, email);

      await supabase.from('email_log').insert({
        recipient_email: CONTACT_INBOX,
        template: 'contact_message',
        status: result.ok ? 'sent' : 'failed',
        provider_id: result.id || null,
        error: result.error || null,
      });

      if (!result.ok) {
        return jsonResponse(req, { error: 'Failed to send' }, 502);
      }
      return jsonResponse(req, { success: true });
    }

    if (body.kind === 'template') {
      const provided = req.headers.get('x-internal-key') || '';
      if (!INTERNAL_API_KEY || provided !== INTERNAL_API_KEY) {
        return jsonResponse(req, { error: 'Unauthorized' }, 401);
      }
      if (!body.template || typeof body.template !== 'string') {
        return jsonResponse(req, { error: 'template required' }, 400);
      }
      if (!isValidEmail(body.to)) {
        return jsonResponse(req, { error: 'Invalid recipient' }, 400);
      }

      const { subject, html, text } = renderTemplate(body.template, body.data || {});
      const result = await sendViaResend(body.to, subject, html, text);

      await supabase.from('email_log').insert({
        recipient_email: body.to,
        template: body.template,
        status: result.ok ? 'sent' : 'failed',
        provider_id: result.id || null,
        error: result.error || null,
      });

      if (!result.ok) {
        return jsonResponse(req, { error: result.error || 'Failed' }, 502);
      }
      return jsonResponse(req, { success: true, id: result.id });
    }

    return jsonResponse(req, { error: 'Unknown kind' }, 400);
  } catch (err) {
    console.error('send-email error:', err);
    return jsonResponse(req, { error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
