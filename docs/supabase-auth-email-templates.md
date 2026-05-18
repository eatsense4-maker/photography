# Supabase Auth email setup

This project should **not** use confirm-account email flow in the app UI.

## Registration behavior

Expected production behavior:
- Email/password signup creates the user
- If **Confirm email** is disabled in Supabase Auth, the user is signed in immediately
- The app redirects the user directly to their dashboard
- The app does **not** show resend-confirmation UI

## Why signup currently returns 500

Auth logs show the current failure is caused by Supabase trying to send a confirmation/recovery email through an SMTP host with an invalid TLS certificate:

- Host used: `mail.fokusaward.com`
- Error: certificate mismatch (`*.web-hosting.com` vs `mail.fokusaward.com`)

So the frontend is not the root cause of the 500.

## Required Supabase dashboard changes

### A) Disable confirm-account email

In Supabase Dashboard:

- **Authentication → Providers → Email**
- Turn **Confirm email** OFF

This is required because you explicitly do **not** want confirm-account logic.

### B) Keep password recovery enabled

In Supabase Dashboard:

- **Authentication → URL Configuration**
- Ensure these redirect URLs are allowed:
  - `http://localhost:5173/auth/reset-password`
  - `https://your-netlify-domain.netlify.app/auth/reset-password`
  - `https://your-domain.com/auth/reset-password`

### C) Fix SMTP before using Supabase-hosted recovery emails

If you want Supabase Auth to send recovery emails directly, fix SMTP TLS for `mail.fokusaward.com` first.

Otherwise recovery emails will keep failing with 500.

## Password recovery email template

Use this subject in Supabase Auth email templates:

- **Reset Password**
  - `Reset your FOKUS Award password`

Suggested HTML template for Supabase Dashboard → Authentication → Email Templates → Reset Password:

```html
<h2>Reset your password</h2>
<p>We received a request to reset your FOKUS Award password.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 20px;background:#bd3020;color:#fff;text-decoration:none;border-radius:8px;">
    Set a new password
  </a>
</p>
<p>This link can be used once and expires for your security.</p>
<p>If you didn't request this, you can ignore this email.</p>
```

## In-app logic already added

The app now:
- signs users in immediately after signup if Supabase returns a session
- removes confirm-account / resend-verification UI from login flow
- handles password recovery links on `/auth/reset-password`
- exchanges `?code=` for a session before allowing password update

## Optional future improvement

If you want complete control over password recovery emails without relying on Supabase SMTP templates, the next step would be to implement a custom recovery flow using a secure Edge Function + your `send-email` function. That is a larger flow and is not required if Supabase email template + SMTP are configured correctly.
