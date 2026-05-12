/**
 * process-email-queue — drains pending rows from `email_queue` and sends them
 * via the locked-down `send-email` function.
 *
 * Designed to be invoked by Supabase scheduled task (cron) or manually. Each
 * call processes up to BATCH_SIZE rows, then returns counts.
 *
 * Auth: require `x-internal-key` matching INTERNAL_API_KEY. Service-role
 * Supabase client is used to bypass RLS.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') || '';
const SEND_EMAIL_URL = Deno.env.get('SEND_EMAIL_URL') || `${SUPABASE_URL}/functions/v1/send-email`;

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;

interface QueueRow {
  id: string;
  recipient_email: string;
  template: string;
  payload: Record<string, unknown>;
  attempts: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const provided = req.headers.get('x-internal-key') || '';
  if (!INTERNAL_API_KEY || provided !== INTERNAL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Atomically claim a batch: mark `sending` so concurrent workers don't double-send.
  const { data: claimed, error: claimErr } = await supabase
    .from('email_queue')
    .update({ status: 'sending' })
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', MAX_ATTEMPTS)
    .select('id, recipient_email, template, payload, attempts')
    .limit(BATCH_SIZE);

  if (claimErr) {
    return new Response(JSON.stringify({ error: claimErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows: QueueRow[] = (claimed || []) as QueueRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const res = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': INTERNAL_API_KEY,
          // Forward service role so Supabase fronts allow the call.
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          kind: 'template',
          template: row.template,
          to: row.recipient_email,
          data: row.payload || {},
        }),
      });

      if (res.ok) {
        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
          .eq('id', row.id);
        sent++;
      } else {
        const errText = await res.text();
        const nextAttempts = row.attempts + 1;
        await supabase
          .from('email_queue')
          .update({
            status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
            attempts: nextAttempts,
            last_error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
            // Exponential backoff: 1m * 2^attempts
            scheduled_for: new Date(Date.now() + 60_000 * Math.pow(2, nextAttempts)).toISOString(),
          })
          .eq('id', row.id);
        failed++;
      }
    } catch (err) {
      const nextAttempts = row.attempts + 1;
      await supabase
        .from('email_queue')
        .update({
          status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts: nextAttempts,
          last_error: err instanceof Error ? err.message.slice(0, 500) : 'unknown',
          scheduled_for: new Date(Date.now() + 60_000 * Math.pow(2, nextAttempts)).toISOString(),
        })
        .eq('id', row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed: rows.length, sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
