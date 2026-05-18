/**
 * Email templates rendered server-side.
 * Keep markup simple and inline-styled — most email clients ignore <style>.
 */

const BRAND_COLOR = '#bd3020';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://fokusaward.com';

function layout(title: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0b0b0f;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0f;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
          <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">FOKUS Award</div>
          <div style="color:#ffdcd6;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">International Photography Award</div>
        </td></tr>
        <tr><td style="padding:32px;color:#1a1a2e;font-size:15px;line-height:1.6;">
          ${body}
        </td></tr>
        <tr><td style="background:#f5f5f7;padding:20px 32px;font-size:12px;color:#666;text-align:center;">
          You are receiving this because of an action on your FOKUS Award account.<br>
          <a href="${SITE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, '')}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">${label}</a></p>`;
}

function esc(v: unknown): string {
  if (v == null) return '';
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export type TemplateName =
  | 'welcome'
  | 'password_recovery'
  | 'submission_received'
  | 'payment_confirmed'
  | 'photo_approved'
  | 'photo_rejected'
  | 'jury_assigned'
  | 'role_changed'
  | 'results_published'
  | 'contact_message';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderTemplate(
  template: TemplateName,
  data: Record<string, unknown>,
): RenderedEmail {
  switch (template) {
    case 'welcome': {
      const name = esc(data.full_name) || 'photographer';
      return {
        subject: 'Welcome to FOKUS Award',
        html: layout('Welcome', `
          <h1 style="margin:0 0 16px;font-size:22px;">Welcome, ${name}.</h1>
          <p>Your FOKUS Award account is ready. You can now browse open editions, submit photos, and track results from your dashboard.</p>
          ${btn(`${SITE_URL}/dashboard`, 'Go to dashboard')}
          <p style="color:#666;font-size:13px;">If you didn't create this account, please ignore this email or contact us.</p>
        `),
        text: `Welcome, ${name}. Your FOKUS Award account is ready: ${SITE_URL}/dashboard`,
      };
    }
    case 'password_recovery': {
      const name = esc(data.full_name) || 'photographer';
      const recoveryUrl = esc(data.recovery_url);
      return {
        subject: 'Reset your FOKUS Award password',
        html: layout('Reset your password', `
          <h1 style="margin:0 0 16px;font-size:22px;">Reset your password</h1>
          <p>Hello ${name},</p>
          <p>We received a request to reset the password for your FOKUS Award account.</p>
          ${btn(recoveryUrl, 'Set a new password')}
          <p>This link can be used once and expires for your security.</p>
          <p style="color:#666;font-size:13px;">If you didn't request a password reset, you can safely ignore this email.</p>
        `),
        text: `Hello ${name}, reset your FOKUS Award password here: ${recoveryUrl}\n\nIf you didn't request this, ignore this email.`,
      };
    }
    case 'submission_received': {
      const title = esc(data.submission_title);
      const id = esc(data.submission_id);
      return {
        subject: 'Submission received — FOKUS Award',
        html: layout('Submission received', `
          <h1 style="margin:0 0 16px;font-size:22px;">We received your submission</h1>
          <p>Your submission <strong>${title}</strong> has been received and is now awaiting review by our team.</p>
          ${btn(`${SITE_URL}/dashboard/submissions/${id}`, 'View submission')}
        `),
        text: `Your submission "${title}" has been received. ${SITE_URL}/dashboard/submissions/${id}`,
      };
    }
    case 'payment_confirmed': {
      const amount = esc(data.amount);
      const currency = esc(data.currency);
      const orderId = esc(data.paypal_order_id);
      return {
        subject: 'Payment confirmed — FOKUS Award',
        html: layout('Payment confirmed', `
          <h1 style="margin:0 0 16px;font-size:22px;">Payment confirmed</h1>
          <p>We've received your payment of <strong>${amount} ${currency}</strong>.</p>
          <p style="color:#666;font-size:13px;">PayPal order: ${orderId}</p>
          <p>Your photo credits have been added to your account. You can now upload photos and submit them for review.</p>
          ${btn(`${SITE_URL}/dashboard/submissions/new`, 'Upload photos')}
        `),
        text: `Payment of ${amount} ${currency} confirmed. Credits added. ${SITE_URL}/dashboard/submissions/new`,
      };
    }
    case 'photo_approved': {
      const title = esc(data.submission_title);
      const id = esc(data.submission_id);
      return {
        subject: 'A photo was approved — FOKUS Award',
        html: layout('Photo approved', `
          <h1 style="margin:0 0 16px;font-size:22px;">A photo was approved</h1>
          <p>One of your photos in <strong>${title}</strong> has been approved for review by the jury.</p>
          ${btn(`${SITE_URL}/dashboard/submissions/${id}`, 'View submission')}
        `),
        text: `A photo in "${title}" was approved. ${SITE_URL}/dashboard/submissions/${id}`,
      };
    }
    case 'photo_rejected': {
      const title = esc(data.submission_title);
      const id = esc(data.submission_id);
      const note = esc(data.review_note) || 'No reason provided.';
      return {
        subject: 'A photo needs your attention — FOKUS Award',
        html: layout('Photo rejected', `
          <h1 style="margin:0 0 16px;font-size:22px;">A photo needs your attention</h1>
          <p>One of your photos in <strong>${title}</strong> was not accepted in its current form.</p>
          <p><strong>Reviewer note:</strong></p>
          <blockquote style="border-left:3px solid ${BRAND_COLOR};margin:8px 0;padding:4px 12px;color:#444;">${note}</blockquote>
          <p>You can replace the photo from your submission detail page.</p>
          ${btn(`${SITE_URL}/dashboard/submissions/${id}`, 'View submission')}
        `),
        text: `A photo in "${title}" was rejected. Note: ${note}. ${SITE_URL}/dashboard/submissions/${id}`,
      };
    }
    case 'jury_assigned': {
      const edition = esc(data.edition_title);
      const category = esc(data.category_name);
      return {
        subject: 'New jury assignment — FOKUS Award',
        html: layout('Jury assignment', `
          <h1 style="margin:0 0 16px;font-size:22px;">New jury assignment</h1>
          <p>You've been assigned to review the <strong>${category}</strong> category in <strong>${edition}</strong>.</p>
          ${btn(`${SITE_URL}/jury`, 'Open jury panel')}
        `),
        text: `Jury assignment: ${category} / ${edition}. ${SITE_URL}/jury`,
      };
    }
    case 'role_changed': {
      const role = esc(data.new_role);
      return {
        subject: 'Your account role was updated',
        html: layout('Role updated', `
          <h1 style="margin:0 0 16px;font-size:22px;">Account role updated</h1>
          <p>Your FOKUS Award account role is now <strong>${role}</strong>. If this was unexpected, please contact us.</p>
          ${btn(`${SITE_URL}/dashboard/profile`, 'Open profile')}
        `),
        text: `Your role is now ${role}.`,
      };
    }
    case 'results_published': {
      const edition = esc(data.edition_title);
      return {
        subject: `Results published: ${edition}`,
        html: layout('Results published', `
          <h1 style="margin:0 0 16px;font-size:22px;">Results are out</h1>
          <p>The results for <strong>${edition}</strong> are now public. Thank you for participating — see where your work placed.</p>
          ${btn(`${SITE_URL}/winners`, 'See winners')}
        `),
        text: `Results for ${edition} are published. ${SITE_URL}/winners`,
      };
    }
    case 'contact_message': {
      const name = esc(data.name);
      const email = esc(data.from_email);
      const subject = esc(data.subject) || '(no subject)';
      const message = esc(data.message).replace(/\n/g, '<br>');
      return {
        subject: `Contact form: ${subject}`,
        html: layout('New contact message', `
          <h1 style="margin:0 0 16px;font-size:22px;">New contact message</h1>
          <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
          <div>${message}</div>
        `),
        text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${esc(data.message)}`,
      };
    }
    default: {
      return {
        subject: 'FOKUS Award notification',
        html: layout('Notification', `<p>${esc(JSON.stringify(data))}</p>`),
        text: JSON.stringify(data),
      };
    }
  }
}
