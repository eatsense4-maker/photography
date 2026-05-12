# FOKUS Award — Production Hardening: Implementation Notes

This document summarises the changes made in response to
[`report.md`](report.md) and lists the **human actions** that still need to
happen before the site is live. Everything that can be done in code has been
done.

The build is green (`npm run build`) and the typechecker passes
(`npx tsc --noEmit`).

---

## 1. Database & RLS — `supabase/migrations/20260513000000_production_hardening.sql`

A single new migration was created. Run it with `supabase db push`.

### Profiles privacy (report §1.1)
- Dropped the old `"Public profiles are viewable by everyone"` policy on
  `profiles` that exposed every column to `anon`.
- New per-role policies:
  - `Profiles: self, admin, jury read` (TO authenticated) — full row access.
  - `Profiles: anon public columns` (TO anon USING (true)) — required by RLS.
- **Column-level GRANT** is the actual privacy gate:
  ```sql
  REVOKE SELECT ON public.profiles FROM anon;
  GRANT SELECT (id, full_name, avatar_url, country, bio, website, instagram)
        ON public.profiles TO anon;
  ```
  Any anon query that asks for `email` or `role` will now be rejected by
  PostgREST. A defence-in-depth view `public_profiles` is also created.

### Public scores after `results_published` (report §1.2)
- Added `Scores: public read for published results` policy:
  `EXISTS (SELECT 1 FROM editions e JOIN categories c … WHERE e.results_published = true)`.

### Public gallery data after profile lockdown
- Added public SELECT policies for published `submissions` and approved
  `submission_photos`, so dynamic gallery/winner pages can read the rows they
  need after RLS hardening.
- Public gallery/winner pages now fetch photographer display names from the
  `public_profiles` view instead of joining directly to `profiles`, preserving
  the email/role privacy boundary for logged-in normal users too.

### Welcome / `handle_new_user` (report §1.3, §2.1)
- `handle_new_user()` now persists `raw_user_meta_data->>'country'` and inserts
  into `email_queue` with template `welcome`. The trigger is wrapped in
  `EXCEPTION WHEN OTHERS` so a failed email cannot block sign-up.

### Payments integrity (report §6.1)
- `CHECK (amount > 0)` and `UNIQUE (paypal_capture_id)` on `payments`.

### Pricing currency
- `pricing_tiers.currency TEXT DEFAULT 'EUR'` with a check constraint for
  EUR/USD/GBP/ALL. Read by `create-paypal-order`.

### Posts trigger (report §3.4)
- `set_posts_updated_at` BEFORE UPDATE trigger added (only if the `posts`
  table exists).

### Email queue + log + event triggers (new infrastructure)
- New tables: `email_queue` (pending/sending/sent/failed with exponential
  backoff) and `email_log` (delivery audit). Both have RLS that allow only
  admins to read.
- New function: `enqueue_email(p_user_id, p_template, p_payload)`
  (SECURITY DEFINER).
- New event triggers that **insert an in-app `notifications` row AND enqueue
  the matching email**:
  | Event | Trigger | Template |
  |---|---|---|
  | Submission submitted | `trg_submission_submitted` | `submission_submitted` |
  | Photo reviewed (approved/rejected) | `trg_photo_reviewed` | `photo_approved` / `photo_rejected` |
  | Jury assigned to category | `trg_jury_assigned` | `jury_assigned` |
  | Profile role changed | `trg_profile_role_changed` | `role_changed` |
  | Edition results published | `trg_results_published` | `results_published` (bulk) |
  | Payment completed | `trg_payment_completed_*` | `payment_completed` |

---

## 2. Email infrastructure

### `supabase/functions/send-email/templates.ts` (new)
Server-side template renderer. 9 templates with a shared layout, brand colour
`#bd3020`, plaintext fallback, HTML escaping. Templates: `welcome`,
`submission_submitted`, `photo_approved`, `photo_rejected`, `jury_assigned`,
`role_changed`, `results_published`, `payment_completed`, `contact_admin`.

### `supabase/functions/send-email/index.ts` (rewritten — report §1.4)
Two modes selected by the request body `kind` field:

- **`kind: "contact"`** — public contact form. Hard-codes recipient to
  `CONTACT_INBOX`. Validates `name (2–100)`, `email (regex)`,
  `message (5–5000)`. In-memory **rate-limit 3 per 60 s** per `ip+email`.
  Uses Resend's `reply_to` to thread replies to the sender.
- **`kind: "template"`** — internal-only. Requires header
  `x-internal-key: <INTERNAL_API_KEY>` and renders one of the templates.

Both paths log every send (or skipped) to `email_log`. If `RESEND_API_KEY` is
not set, the function returns `{ id: "skipped" }` so the queue worker keeps
draining instead of retrying forever. CORS uses an `ALLOWED_ORIGIN` allow-list
with `Vary: Origin`. No raw HTML from caller is ever forwarded.

### `supabase/functions/process-email-queue/index.ts` (new — cron worker)
- Auth via `x-internal-key`.
- Atomically claims up to 25 pending rows (`UPDATE … SET status='sending' …
  WHERE status='pending' AND scheduled_for <= now() AND attempts < 5`).
- Posts each to `send-email` (template mode) with the internal key.
- Success → `status='sent'`. Failure → `status='pending'` with
  `scheduled_for = now() + 60s · 2^attempts` until attempt 5 → `status='failed'`.

---

## 3. Edge function hardening

### `r2-delete` (report §1.5)
After validating the JWT, the function now reads `profile.role`. Non-admins
may only delete R2 keys that belong to their own `submission_photos`
(matching `storage_key` or `thumbnail_key`). Returns `{ deleted, skipped }`.

### `create-paypal-order` (report §6.4)
- Reads `currency` from the `pricing_tiers` row and uses it for the PayPal
  order. Legacy direct-amount path validates the client `currency` against
  `EUR/USD/GBP/ALL`.

### `capture-paypal-order` (report §6.3)
Cross-checks the captured amount and currency against the server-side
expected total computed from `pricing_tiers` + grant scope. On mismatch the
function calls `POST /v2/payments/captures/{id}/refund`, inserts a payment
row with `status='refunded'` and `metadata.reason='amount_mismatch'`, and
returns 400. The previous behaviour (trust whatever amount came back) is gone.

---

## 4. Frontend fixes

| Report § | File | Change |
|---|---|---|
| 1.6 | `src/pages/auth/AuthCallback.tsx` | Awaits session, fetches `profile.role`, routes to `/admin` / `/jury` / `/dashboard` via new `getDashboardPath` helper |
| 1.7 | `src/pages/auth/LoginPage.tsx`, `src/components/CompetitionModal.tsx`, `src/hooks/useAuth.ts` | Surfaces "email not confirmed" with a **Resend verification email** UI; min password length 6→8 |
| 1.8 | `src/components/layout/Navbar.tsx` | Sign-out (desktop dropdown + mobile menu) now goes through the existing `ConfirmDialog` |
| 3.3 | `src/pages/jury/JuryRanking.tsx` | Pre-fetches submission ids for the selected category and filters scores with `.in('submission_id', ids)` instead of the broken nested filter |
| 4.0 | `src/pages/admin/AdminDashboard.tsx` | Quick-action uses `<Link>` instead of `<motion.a>` |
| 5.1 | `src/pages/public/PrivacyPage.tsx` (new), `src/pages/public/TermsPage.tsx` (new), `src/App.tsx` | `/privacy` and `/terms` routes |
| 8.4 | `create-paypal-order`, `capture-paypal-order` | Removed init `console.log`s |
| — | `src/pages/public/ContactPage.tsx` | Sends `{ kind: 'contact', … }` to the new send-email contract |
| — | `src/lib/auth-utils.ts` (new) | `getDashboardPath(role)` shared helper |
| — | `src/hooks/useAuth.ts` | Removed dead `_signingIn` export, added `resendVerification()` |
| — | `src/pages/auth/ResetPasswordPage.tsx` | Min password length 6→8 |

---

## 5. Tooling

- `.env.example` — full list of all frontend `VITE_*` and edge-function
  secrets, with comments.
- `scripts/generate-sitemap.mjs` — reads editions / categories / posts /
  curators from Supabase and writes `dist/sitemap.xml`. Run after `vite build`.

---

## 6. 🛑 Human actions required before launch

These cannot be done from code — please complete them in the Supabase /
Resend / PayPal dashboards.

1. **Supabase Auth SMTP** *(you mentioned this is not yet configured)*
   Project → **Authentication → SMTP Settings**. Point it at your Resend SMTP
   credentials (or any transactional provider). Sender = `FROM_EMAIL`.
   *Until this is done, sign-up confirmation, password reset, and magic
   links will not deliver — even though all in-app flows are ready.*

2. **Apply the migration**
   ```bash
   supabase db push
   ```
   This installs `email_queue`, `email_log`, the event triggers, the
   `enqueue_email()` function, the tightened `profiles` RLS, the
   `payments` constraints, and the `pricing_tiers.currency` column.

3. **Edge function secrets** — `supabase secrets set …` for:
   - `RESEND_API_KEY` (from Resend dashboard)
   - `FROM_EMAIL` — must be a verified Resend sender, e.g.
     `FOKUS Award <noreply@fokusaward.com>`
   - `CONTACT_INBOX` — where contact-form submissions are forwarded
   - `INTERNAL_API_KEY` — `openssl rand -hex 32`
   - `SITE_URL` — e.g. `https://fokusaward.com`
   - `SEND_EMAIL_URL` — e.g.
     `https://<project>.functions.supabase.co/send-email`
   - `ALLOWED_ORIGIN` — comma-separated list of allowed CORS origins
   - PayPal / R2 secrets (already in place if PayPal currently works)

4. **Deploy the new functions**
   ```bash
   supabase functions deploy send-email
   supabase functions deploy process-email-queue
   supabase functions deploy r2-delete
   supabase functions deploy create-paypal-order
   supabase functions deploy capture-paypal-order
   ```

5. **Schedule the email worker**
   Supabase → **Database → Cron**. Add a job that runs **every minute**:
   ```sql
   select net.http_post(
     url := 'https://<project>.functions.supabase.co/process-email-queue',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'x-internal-key', '<INTERNAL_API_KEY>'
     )
   );
   ```

6. **Resend domain verification** — verify DKIM + SPF for the
   `FROM_EMAIL` domain. Without this, Gmail/Outlook will drop most messages.

7. **Cloudflare R2 bucket CORS** — ensure the bucket allows your production
   origin so direct uploads from the browser still succeed.

8. **PayPal live credentials** — switch
   `PAYPAL_API_URL=https://api-m.paypal.com` and replace the sandbox
   `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` with live values.

Once steps 1–8 are done, sign-up → verification → submission → review →
results announcement → payment will all generate the matching in-app
notification *and* email automatically.

---

## 7. Non-blocking polish (deferred)

Items still flagged 🟡 in `report.md` that did not need to ship for launch:
admin bulk actions, type-to-confirm destructive modals, OG/Twitter meta on
deep public pages, lint cleanup, automated tests, log shipping. None of
these affect security or correctness; they can be addressed iteratively
post-launch.
