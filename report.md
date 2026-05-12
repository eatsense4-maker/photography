# FOKUS Award — Production Readiness Audit (report.md)

> Scope: full website (public, auth, user dashboard, jury, admin, edge functions, DB/RLS, styling, SEO, i18n).
> Findings below are the issues that should be addressed **before going live**. Items that are already correct are listed separately in [`pass.md`](pass.md).

---

## ✅ Implementation status (post-audit pass)

All **🔴 critical** and **🟠 high** items in this report were addressed in a hardening
pass. See [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md) for the full
change log, the new email-notification system, and the **required human follow-ups**
(SMTP / Edge function secrets / cron schedule). The few remaining items are 🟡
polish/non-blocking and are tracked in the same file.

Final audit note: the last pass also added public RLS for published gallery
submission/photo rows and moved public photographer-name reads to
`public_profiles`, so profile privacy remains intact for both anonymous and
logged-in visitors.


Severity legend:
- **🔴 Critical** — security, data-loss, or feature-blocking. Must fix.
- **🟠 High** — broken UX or wrong business logic at scale. Should fix before launch.
- **🟡 Medium** — degraded experience, polish, or technical debt. Fix soon.
- **🔵 Low** — cosmetic or nice-to-have.

---

## 1. Security & Privacy

### 🔴 1.1 `profiles` SELECT policy is fully public — emails leaked
[supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql#L279-L280)

```sql
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
```
Any anonymous visitor can `select email, country, role` for every registered user via `from('profiles').select('*')`. This is a GDPR / privacy violation and a spam-harvest vector.

**Fix:** split into two policies — public columns only (e.g. `full_name`, `avatar_url`) via a view, or restrict full row access to `auth.uid() = id OR is_admin()`. Use a security-definer view (`public_profiles`) for the small number of places that need names (e.g. winners list).

### 🔴 1.2 `scores` has no public SELECT — Winners / Gallery pages break for anonymous users
[supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql#L369-L373)

The only `scores` SELECT policy is `jury_id = auth.uid() OR role='admin'`. But [WinnersPage](src/pages/public/WinnersPage.tsx#L132-L142) and [EditionGalleryPage](src/pages/public/EditionGalleryPage.tsx#L190-L195) compute placings by reading `scores` directly from the browser as an anonymous user.

In production this returns **empty arrays** → no winners are shown despite `results_published = true`.

**Fix:** either
- add `CREATE POLICY "Public can read scores of published editions" ON scores FOR SELECT USING (EXISTS (SELECT 1 FROM submissions s JOIN editions e ON e.id = s.edition_id WHERE s.id = scores.submission_id AND e.results_published))`, or
- precompute placings into a `winners` materialized table populated when an admin clicks "Publish results" and read that publicly.

The second option is preferable (cheaper for clients and prevents jury identity leakage).

### 🔴 1.3 `send-email` edge function is an open relay
[supabase/functions/send-email/index.ts](supabase/functions/send-email/index.ts#L22-L48)

- No auth check, no rate limit.
- `to` is taken straight from the request body.
- Any visitor (or bot) can call it to send arbitrary HTML emails through your Resend account.

**Fix:** require a JWT, hard-code `to: 'info@fokusaward.com'` on the contact-form path (or whitelist a per-user destination derived from the JWT), drop arbitrary `html`/`text` and accept structured fields you render server-side, add a simple per-IP rate limit (e.g. via `req.headers.get('cf-connecting-ip')` + Supabase `kv` or a `contact_messages` insert).

### 🟠 1.4 `ResetPasswordPage` password policy inconsistent with Register
- [RegisterPage](src/pages/auth/RegisterPage.tsx) requires 8+ chars.
- The reset flow accepts 6+ chars (typical of older Supabase boilerplate). Verify the file and align to **8+ chars with at least one number and one letter** to match the rest of the site.

### 🟠 1.5 `CompetitionModal` sign-up uses a different/weaker password rule
[src/components/CompetitionModal.tsx](src/components/CompetitionModal.tsx) — the inline `handleSignUp` allows a weaker password than `RegisterPage`. Make both call the same `signUp()` helper, or share a single Zod schema. Inconsistent rules confuse users and split the QA surface.

### 🟠 1.6 `r2-delete` accepts any `submissions/...` key without ownership check
[supabase/functions/r2-delete/index.ts](supabase/functions/r2-delete/index.ts#L150-L160)

It validates the JWT but does not verify the keys belong to the caller. An authenticated user can submit keys belonging to **another** user's photos and delete them from R2. The DB rows are still protected by RLS, but the underlying object disappears (DB row points at a 404).

**Fix:** look up `submission_photos` (or `submissions`) by `storage_key` and ensure `user_id = auth.uid() OR is_admin()` before deleting.

### 🟠 1.7 Profile auto-create trigger discards `country` from sign-up metadata
[useAuth.signUp](src/hooks/useAuth.ts#L52-L73) passes `options.data = { full_name, country }`, but the `handle_new_user` trigger in [001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) writes only `full_name`. Country selected on registration is silently dropped (the profile row ends up with `country = NULL`).

**Fix:** update the trigger to read `new.raw_user_meta_data->>'country'` too.

### 🟡 1.8 Public profile dropdown signs out without confirmation
[src/components/layout/Navbar.tsx](src/components/layout/Navbar.tsx#L218-L221) — direct `signOut()` on click. The sidebar has a confirmation modal; the navbar dropdown does not. Add the same `ConfirmModal` for consistency and to avoid accidental sign-outs on mobile.

### 🟡 1.9 No CSRF / abuse protection on contact form
Even after 1.3 is fixed, add a hCaptcha / Turnstile token check before invoking `send-email`.

---

## 2. Authentication & Onboarding

### 🔴 2.1 `AuthCallback` always redirects to `/dashboard`
[src/pages/auth/AuthCallback.tsx](src/pages/auth/AuthCallback.tsx#L13-L24)

After Google OAuth, admins and jury members are sent to `/dashboard` (user view), which they don't have a role for in some flows, then bounced. The router protects `/dashboard` with `roles={['user','admin']}` — so **jury** falls into an error state.

**Fix:** read the profile once and use the same `getDashboardPath()` helper that `Navbar` uses.

### 🟠 2.2 `CompetitionModal` sign-up then sign-in flow breaks if email confirmation is on
The modal calls `signUp` then immediately `signInWithPassword`. If Supabase **Confirm email** is enabled (recommended), sign-in returns `Email not confirmed` and the user is stuck on step 1 without explanation.

**Fix:** detect the unconfirmed-email path, show a clear "Check your inbox to verify" step, and gate the rest of the modal behind a successful confirmation (poll `getSession`, or persist the in-progress submission to localStorage and resume on `/auth/callback`).

### 🟠 2.3 `_signingIn` is a module-level mutable export (race-prone)
[src/hooks/useAuth.ts](src/hooks/useAuth.ts#L6-L8) — exported `let` mutated by `signIn` and read by `AuthProvider`. Works today, but if React 18 StrictMode mounts twice in dev or two tabs sign in simultaneously the flag flips. Replace with a `useRef` inside `AuthProvider` or a Zustand boolean.

### 🟡 2.4 `ProfilePage` avatar upload is a TODO
The preview shows a local blob but it's never uploaded or persisted. Either implement the R2/Supabase storage upload + `profiles.avatar_url` update, or hide the control until it's ready.

### 🟡 2.5 No "resend verification email" UX
`LoginPage` and `CompetitionModal` show only a generic error if the user tries to log in before confirming their email. Add a "Resend verification" button bound to `supabase.auth.resend({ type: 'signup', email })`.

---

## 3. Submission & Payment Flow

### 🟠 3.1 Photo uploads to category images / posts go to the `partners` bucket
[AdminCategories](src/pages/admin/AdminCategories.tsx#L120-L132) and [AdminPosts](src/pages/admin/AdminPosts.tsx#L106-L165) upload to `from('partners')`. Functional but confusing for ops and audit. Create dedicated `categories/` and `posts/` buckets (or a single `cms` bucket) with their own RLS.

### 🟠 3.2 `NewSubmission` / `CompetitionModal` upload loop has no retry
[CompetitionModal](src/components/CompetitionModal.tsx#L236-L252) — if one photo upload fails, the user sees a toast but the submission is already inserted with `status='submitted'` and partial photos. There is no resume path.

**Fix:** start submission in `draft`, only flip to `submitted` after **all** photos uploaded successfully, and surface a "Retry failed photos" affordance in `SubmissionDetail` while it's still a draft.

### 🟠 3.3 `JuryRanking` query filter on nested join doesn't work as written
[src/pages/jury/JuryRanking.tsx](src/pages/jury/JuryRanking.tsx#L66-L73)

```ts
.from('scores')
.select('..., submissions(...)')
.eq('submissions.category_id', selectedCategory)
```
PostgREST does not filter on nested joined fields in this form — every score for every category is returned and re-filtered in JS. With many editions/scores this becomes slow and could trip RLS on rows the jury shouldn't even see.

**Fix:** filter on a direct `submission_id` list (fetch submissions for the category first, then `in('submission_id', ids)`).

### 🟡 3.4 `JuryReview` randomizes order with `Math.random()` once per fetch
Two reviewers get different orders, which is fine; but if a jury member refreshes mid-pass they restart in a new random order, which is disorienting. Persist a per-jury seeded order (e.g. `order by hashtext(jury_id || photo_id)`).

### 🟡 3.5 PayPal `currency` defaults to whatever the client sends
[create-paypal-order](supabase/functions/create-paypal-order/index.ts#L121) — `body.currency || 'EUR'`. The amount, however, comes from the DB (good). Hard-code currency from the tier/category record instead of trusting the client, otherwise a manipulated request can mismatch currency vs. amount.

### 🟡 3.6 `payments.amount` is not cross-checked vs DB-computed total in `capture-paypal-order`
The capture handler trusts PayPal's reported `capture.amount.value`. Compare it against the same DB lookup used at order creation; if they diverge, refund and refuse to grant credits.

---

## 4. Admin Tools

### 🟠 4.1 `AdminJury.handleAssign` has no duplicate guard
[src/pages/admin/AdminJury.tsx](src/pages/admin/AdminJury.tsx#L121-L135) — inserting the same `(jury_id, edition_id, category_id)` twice will throw a DB error visible only as a generic `toast.error(error.message)`. Add a `UNIQUE` constraint (if not already) and check it client-side, or surface a friendlier message.

### 🟠 4.2 `AdminUsers` role select changes status on selection
Clicking the role dropdown opens a confirmation modal — good. But the dropdown's local value also visually updates to the new role even if the admin cancels. Reset on cancel.

### 🟠 4.3 `AdminEditions` form is missing several DB fields
The form exposes `title, slug, year, description, theme, theme_description, status, submission_start/end, published`, but the schema also has `hero_image_url`, `rules`, `prizes`, `judging_criteria` etc. Admins cannot edit these from the UI. Add them or delete the unused columns.

### 🟠 4.4 `AdminDashboard` "Quick Actions" use `<a href>` not `<Link>`
[src/pages/admin/AdminDashboard.tsx](src/pages/admin/AdminDashboard.tsx#L226-L260) — `<motion.a href={...}>` causes a full-page reload. Replace with `Link to={...}` (or `motion(Link)`).

### 🟡 4.5 `AdminContent` and `/admin/content` route exist but are not in the sidebar
[Sidebar](src/components/layout/Sidebar.tsx#L63-L76) lists posts, partners, etc., but skips `AdminContent`. Either link it or remove the route.

### 🟡 4.6 No bulk actions on submissions table
`AdminSubmissions` accept/reject is one row at a time. Add multi-select + bulk approve/reject, especially needed for the volume implied by past editions (1,500+ photographers per the homepage stats).

### 🟡 4.7 Destructive admin deletes have no "type the name to confirm" guard
Deleting an edition cascades to categories, pricing tiers, submissions and photos. The current modal is a simple "Are you sure?" — add a destructive-confirm pattern (typed slug).

---

## 5. Public Site, SEO, i18n

### 🟠 5.1 Footer links `/privacy` and `/terms` 404
[Footer](src/components/layout/Footer.tsx#L131-L138) links to two routes that do not exist in [`App.tsx`](src/App.tsx#L82-L99). They fall through to `NotFoundPage`. Either create the pages (required for GDPR / PayPal compliance) or hide the links.

### 🟠 5.2 Hard-coded Unsplash images across category pages
[CategoryDetailPage.CATEGORY_DATA](src/pages/public/CategoryDetailPage.tsx#L107-L210), [HomePage.CATEGORY_LIST](src/pages/public/HomePage.tsx#L53-L62), [ApplyPage hero background](src/pages/public/ApplyPage.tsx#L84-L88) all use Unsplash CDN URLs. These can rotate or 404 at any time. Move them to `categories.image_url` (already on the DB) and a small CMS for hero/about images.

### 🟠 5.3 `sitemap.xml` is static
[public/sitemap.xml](public/sitemap.xml) does not reflect dynamic editions, categories, news posts, or curator slugs. Build a script (`scripts/generate-sitemap.mjs`) that runs at build time and queries Supabase, then drop it into `dist/`.

### 🟠 5.4 Hero competition modal auto-opens on every first visit
[HomePage](src/pages/public/HomePage.tsx#L117-L123) — fine for marketing, but loading a heavy `CompetitionModal` chunk plus PayPal SDK on the landing page hurts LCP and SEO. Defer until the user clicks "Apply now".

### 🟠 5.5 i18n coverage gaps
Several admin/jury pages mix `t('...')` with English literal strings (e.g. "News & Events", "Live Scoring" sidebar entries, all error toasts, all modal titles). Either commit to English-only for staff pages or translate the lot — pick one and document it.

### 🟡 5.6 `usePageTitle` only sets `document.title` — no Open Graph / Twitter card
For social sharing of news posts, winners, and editions you need per-page `<meta>` tags. Add `react-helmet-async` (or VITE-time prerender) for og:title, og:image, og:description, twitter:card. Currently social shares of e.g. a winner photo will show the home page meta.

### 🟡 5.7 Accessibility audit
Spot-checks:
- Many decorative icons inside buttons have no `aria-label`; e.g. `Button variant="ghost" icon={<Edit/>}` rows in `AdminPricingTiers` and `AdminCategories` are buttons with no accessible name.
- `CompetitionModal` overlay traps focus visually but no `role="dialog"` / `aria-modal` / `aria-labelledby`.
- `Sidebar` NavLinks rely on color only for active state — add `aria-current="page"`.

### 🟡 5.8 Contact form lacks success/failure states
[ContactPage](src/pages/public/ContactPage.tsx) shows toasts but does not block the submit button or surface server-side validation errors. Disable while sending (the `sending` state exists; pass it to `Button` `loading`).

### 🟡 5.9 Hard-coded contact details
`+355 XX XXX XXXX` placeholder ships to production. Move all contact details to a `pages` / `settings` table (the `pages` table already exists).

### 🔵 5.10 Mixed dark/light surfaces
`public-invert` class is sprinkled to switch between dark hero and white body. It works but is fragile; consider building two clearly-named themes and applying them at section level.

---

## 6. Database & Migrations

### 🟠 6.1 Migration naming inconsistency
Files mix `001_…`, `006_…` and `20260512000000_…`. Supabase CLI sorts lexicographically, so `006_` runs after `20260328184052_` on a fresh project (the numeric prefix beats the date). Re-number to a single scheme (timestamp-only is the Supabase default) before any other developer runs `supabase db push`.

### 🟠 6.2 `user_credits.submissions_remaining` is dead weight
Kept nullable for backward compatibility — fine — but `decrement_submissions_remaining()` still references it. Schedule a follow-up migration to drop the column and the legacy RPC.

### 🟡 6.3 No `updated_at` on `posts`
The `posts` table in [scripts/create-posts-table.sql](scripts/create-posts-table.sql) has `updated_at DEFAULT now()` but no trigger; updates don't bump the timestamp. Add the `update_updated_at` trigger that other tables use.

### 🟡 6.4 No DB constraints on `payments.amount`
`amount DECIMAL(10,2)` allows negatives and zero. Add a `CHECK (amount > 0)` and a unique constraint on `paypal_capture_id`.

### 🟡 6.5 `submission_photos` has no per-submission count check
Current limits are enforced via the photo-credit trigger, but a defensive `CHECK ((SELECT count(*) FROM submission_photos WHERE submission_id = NEW.submission_id) <= category.max_photos)` (or a row-count trigger) would prevent overage even if credits were misconfigured.

---

## 7. Performance & Reliability

### 🟡 7.1 Many list pages fetch everything client-side
`AdminUsers`, `AdminSubmissions`, `AdminPayments`, `WinnersPage`, `EditionGalleryPage` pull entire tables without server pagination. Move to range queries (`.range(from, to)` and `count: 'estimated'`) before user/submission counts grow.

### 🟡 7.2 N+1 queries in `JuryDashboard.fetchProgress`
[src/pages/jury/JuryDashboard.tsx](src/pages/jury/JuryDashboard.tsx#L33-L82) does one `count` and one `count` per assigned category. Replace with a single `rpc('jury_progress', { jury_id })` returning aggregates.

### 🟡 7.3 No skeletons / loading on public pages
HomePage / ApplyPage show only a spinner during the first paint. Add skeleton sections to avoid layout shift (especially the hero slider, which currently renders empty if `sliderPosts` is empty).

### 🟡 7.4 `AdminDashboard` revenue query loads every row
`.from('payments').select('amount').eq('status','completed')` — sum on the client. Replace with `rpc('total_revenue', { edition_id })`.

### 🔵 7.5 PayPal SDK loaded on every page that imports `PayPalProvider`
Confirm it's only mounted when the user actually reaches the payment step (currently `CompetitionModal` wraps the entire modal in `<PayPalProvider>` even on the info / category screens).

---

## 8. Code Quality & Tooling

### 🟡 8.1 ESLint reports ~100 errors (mostly `@typescript-eslint/no-explicit-any` + unused vars)
- All Supabase joined-row callbacks use `(s: any)`. Add small typed helpers in [src/types/index.ts](src/types/index.ts) and remove `any`.
- A handful of unused imports remain (e.g. `Eye`, `Image`, `Star` icons that were swapped out).
- Run `npm run lint -- --max-warnings 0` in CI to keep the pile from growing.

### 🟡 8.2 No automated tests
Zero unit/integration/e2e tests in the repo. At minimum add Playwright smoke tests for: anonymous browse → login → submit → admin review → score → publish results. That single path covers ~80% of regressions.

### 🟡 8.3 No CI pipeline
`netlify.toml` builds and deploys, but there is no test/lint/typecheck gate. Add a GitHub Action that runs `npm ci && npm run typecheck && npm run lint && npm run build` on PRs.

### 🟡 8.4 `console.log` in production edge functions
`create-paypal-order` and `capture-paypal-order` log secrets-relevant context (`clientIdSet`, capture data) at init and on every error. Keep error logs, but drop the init banner and avoid logging full PayPal payloads (they include payer email).

### 🔵 8.5 No environment template
There is no `.env.example`. Onboarding requires reading the source to discover `VITE_SUPABASE_URL`, R2 vars, PayPal vars. Add a checked-in `.env.example`.

---

## 9. Operational

### 🟠 9.1 No backups / restore documentation
Both Supabase Postgres and Cloudflare R2 need a documented backup policy. Today, an accidental `delete from editions` cascades the entire competition history.

### 🟠 9.2 No monitoring / error tracking
Hook the React app to Sentry (or LogRocket) and pipe edge-function errors to the same project. Today a 500 in `capture-paypal-order` is invisible until a user complains.

### 🟡 9.3 `migration-log.txt` is checked in
[migration-log.txt](migration-log.txt) appears to be developer scratch. Either move to `docs/` with intent or delete and add to `.gitignore`.

### 🟡 9.4 Several `scripts/` one-off migrations are still in tree
`fetch-iffa14.mjs`, `parse-kuratore.mjs`, `read-pdfs6.mjs`, `upgrade-fb-photos.mjs`, etc. Useful for historical data import, but should be moved under `scripts/legacy/` and documented.

---

## 10. Quick Wins (do these first)

1. **Add public read policy for `scores` of published editions** (or denormalize winners) — currently the Winners page is empty for the public. [§1.2]
2. **Restrict `profiles` SELECT** to non-PII columns. [§1.1]
3. **Lock down `send-email`** — JWT + fixed `to`. [§1.3]
4. **Create `/privacy` and `/terms` pages**, even as placeholders, and link real content. [§5.1]
5. **Fix `AuthCallback` role-based redirect.** [§2.1]
6. **Fix the trigger to persist `country` from sign-up metadata.** [§1.7]
7. **Make `r2-delete` check ownership.** [§1.6]
8. **Replace `<a href>` with `<Link>` in admin dashboard quick actions.** [§4.4]

These eight changes are small, isolated, and unblock the rest of the launch checklist.

---

## 11. Suggested launch checklist

- [ ] §1 security items closed
- [ ] §2 auth callback + verification flow validated end-to-end with Supabase email confirmation **on**
- [ ] §5.1 + §5.3 SEO basics (privacy/terms pages, dynamic sitemap, og: meta)
- [ ] §6.1 migration order normalized and `supabase db reset` succeeds from a clean DB
- [ ] §8.1 + §8.3 lint clean + CI green
- [ ] §9.1 + §9.2 backups configured, Sentry wired
- [ ] Manual run of Playwright smoke path (§8.2) green on staging
- [ ] Load test PayPal capture path against PayPal sandbox with concurrent users

Once those are signed off, the site is ready for public traffic.
