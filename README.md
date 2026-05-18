# FOKUS Award Platform

Production web app for FOKUS Award (React + Vite + TypeScript), with Supabase backend services and Cloudflare R2 media.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Netlify production deployment

This project is configured for SPA hosting on Netlify.

### 1) Build settings

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** `20` (pinned in `netlify.toml`)

### 2) Environment variables in Netlify

Set these in **Site settings → Environment variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_R2_PUBLIC_URL`
- `VITE_PAYPAL_CLIENT_ID`
- `VITE_PAYPAL_CURRENCY` (usually `EUR`)
- `VITE_APP_URL` (your Netlify site URL or custom domain)
- `VITE_SITE_URL` (canonical public URL)

Use `.env.example` as the reference template.

### 3) Supabase edge-function CORS (important)

Supabase edge functions in this project use `ALLOWED_ORIGIN`. Make sure it includes your final Netlify origin(s), e.g.:

- `https://your-site.netlify.app`
- `https://your-custom-domain.com`
- `https://www.your-custom-domain.com`

Without this, browser calls to functions (including R2 presign) can fail due to CORS.

### 4) SPA routing

`netlify.toml` already includes a redirect from `/*` to `/index.html`, so direct navigation to nested routes works.

### 5) Security headers / CSP

Security headers and CSP are already set in `netlify.toml`. If you add new external providers (scripts, fonts, images, APIs), update CSP allow-lists accordingly.
