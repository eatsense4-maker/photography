# FOKUS Award — What's Working Well (pass.md)

> Companion to [report.md](report.md). This file lists the parts of the codebase that passed the audit and require no immediate action.

## Architecture

- **Stack choice is solid.** Vite + React 18 + TypeScript + Tailwind + Supabase + Cloudflare R2 + PayPal is appropriate for the scale and budget, and the project leverages each correctly.
- **Routing is well-organized.** [`App.tsx`](src/App.tsx) cleanly separates public, auth, user, jury and admin trees with `ProtectedRoute` enforcing roles and lazy-loaded page chunks.
- **State is sensible.** Zustand stores ([`src/stores/index.ts`](src/stores/index.ts)) keep auth, UI and notifications in three small slices instead of one mega-store.
- **i18n is wired correctly.** `i18next` with `LanguageDetector`, fallback to `en`, and JSON locale files in [src/i18n/locales](src/i18n/locales) — easy to extend.

## Security (what's right)

- **Privilege-escalation patched.** [20260406000000_fix_profiles_rls_and_rpc.sql](supabase/migrations/20260406000000_fix_profiles_rls_and_rpc.sql) blocks users from changing their own `role` and adds an auth check to `decrement_submissions_remaining`.
- **PayPal pricing is server-trusted.** [create-paypal-order](supabase/functions/create-paypal-order/index.ts#L60-L120) re-derives the amount from `pricing_tiers` + `categories` in the DB and refuses tier/category mismatches — the client cannot manipulate the price.
- **Idempotent capture.** [capture-paypal-order](supabase/functions/capture-paypal-order/index.ts#L140-L160) detects already-completed orders, handles `ORDER_ALREADY_CAPTURED`, and short-circuits on existing `payments.paypal_order_id` rows. Refreshes mid-checkout won't double-charge or double-grant credits.
- **CORS is allowlist-based** (not `*`) and reflects only known origins on the PayPal functions.
- **R2 presigning is short-lived** (15 min) and uses unsigned-payload AWS SigV4 with content-type binding.
- **Per-category credit enforcement is trigger-based.** [20260512000000_per_category_credits.sql](supabase/migrations/20260512000000_per_category_credits.sql) recomputes `photo_credits_used` from authoritative table state, so the budget can't drift even if the client misbehaves.
- **`r2-delete` requires a JWT** (ownership check is still missing — see report.md §1.6 — but the auth gate is in place).
- **Service-role key stays server-side.** The client uses anon key only; service role is referenced only inside edge functions.

## Database

- **Foreign keys and ON DELETE CASCADE are set everywhere they should be**, so deleting a submission cleans photos/payments without orphan rows.
- **`updated_at` triggers** are in place for `editions`, `submissions`, `scores`.
- **Indexes exist** on hot columns: `pricing_tiers.edition_id`, `user_credits.user_id/edition_id`, `posts(published, pinned, published_at)`, `posts.slug`.
- **Idempotency-friendly migrations.** Most use `DROP POLICY IF EXISTS` / `CREATE OR REPLACE FUNCTION`, so re-applying is safe.
- **Per-category bundle handling is correct.** Bundle tiers grant credits to every paid category in the edition; single-category tiers refuse mismatched categories.

## Auth flow

- **`useAuth` hook is well-shaped** — exposes `signIn`, `signUp`, `signInWithGoogle`, `resetPassword`, `signOut`, `updateProfile`, `hasRole` with consistent error propagation.
- **`AuthProvider` + `_signingIn` flag** correctly suppresses the duplicate profile fetch race between `signIn` and `onAuthStateChange`.
- **Password reset email** uses the right `redirectTo` so the flow works in dev and prod without code changes.
- **`ProtectedRoute`** enforces role lists and redirects unauthenticated users to `/login` without flashing protected content.

## User & Jury experience

- **Submission detail page** ([SubmissionDetail.tsx](src/pages/user/SubmissionDetail.tsx)) handles owner vs. admin views, allows owners to cancel/delete while in `draft`/`submitted`, and properly cleans up R2 keys before deleting DB rows.
- **`JuryReview`** has good ergonomics: keyboard arrow navigation, "next unscored" auto-advance, filter by scored/unscored, lightbox preview, one-vote-only enforcement client-side.
- **`JuryDashboard`** progress bars give a clear "X of Y reviewed" view per category.
- **Score range** is consistently 50–100 across UI and validation.
- **`AdminSubmissions`** supports grouping by user or category, pagination, search, status/category filters, and inline approve/reject with confirmation modals.

## Admin tooling

- **`AdminPricingTiers`** correctly distinguishes bundle vs. per-category tiers and pins category-scoped tiers to a single category (consistent with the edge-function enforcement).
- **`AdminCategories`** carries bilingual fields (`name_al`, `description_al`, `prize_label_al`, etc.) end-to-end and supports prize, activation flag, and submission deadline per category.
- **`AdminEditions`** allows duplicating an edition — handy for prepping the next year.
- **`AdminUsers`** role change goes through a confirmation modal and uses the corrected RLS (admins-can-update-any-profile).
- **`AdminPosts`** supports a full magazine workflow: cover image, gallery, Facebook embed, featured, pinned, publish/unpublish, category — with multi-image upload.

## Frontend polish

- **Public design system** ([src/components/ui](src/components/ui)) — `Button`, `Card`, `Modal`, `Input`, `Textarea`, `Select`, `Badge`, `Breadcrumb`, `SkeletonTable`, `StatsCard`, `EmptyState` — provides consistent visual language across admin and public.
- **Framer Motion** is used tastefully (staggered list reveals, hero slide transitions, modal pops) without being noisy.
- **Responsive breakpoints** are correctly applied: `sm:`/`md:`/`lg:` grids on `ApplyPage`, `AdminSubmissions`, `Sidebar` collapse on mobile, hero clamps on small viewports.
- **Mobile menu** in `Navbar` closes automatically on route change.
- **Hero slider** auto-advances, pauses on hover, supports prev/next arrows, and indicator dots — and falls back gracefully to a single post if nothing is pinned/featured.
- **`PostDetailPage`** has a proper article layout with breadcrumb, hero, prose styling, Facebook embed, lightbox gallery, and a "back to news" link.
- **`CategoryDetailPage`** bilingual content (objective, description, photo rules, accepted/rejected manipulations) is comprehensive.

## Build & deploy

- **TypeScript build is clean** — `tsc --noEmit` passes with no errors.
- **Vite build succeeds** and produces a reasonable bundle (lazy splitting per route + lazy `CompetitionModal`).
- **Netlify config** ([netlify.toml](netlify.toml)) is present and ties build/publish to the right directory.
- **Edge functions** (`create-paypal-order`, `capture-paypal-order`, `r2-presign`, `r2-delete`, `send-email`) all have correct OPTIONS handlers, consistent JSON error shape, and clear console error context for ops.

## Content

- **CURATORS data** has full bilingual bios and is statically bundled — fast and SEO-friendly.
- **Theme essays** (FRYMË / BREATH) for the current edition are written in both English and Albanian and embedded directly in `CategoryDetailPage`.

## Summary

The codebase is well above the typical "MVP" line for an event/competition site. Authentication, payment integrity, RLS for write paths, and per-category credit accounting are correctly implemented. The remaining work in [report.md](report.md) is mostly about closing public-data leaks (profiles/scores SELECT policies), tightening one open-relay edge function, adding the missing legal pages, and routine pre-launch hygiene (sitemap, SEO meta, monitoring, CI). None of the issues are deep architectural problems — they are all isolated changes.
