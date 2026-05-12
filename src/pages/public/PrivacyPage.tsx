import { usePageTitle } from '@/hooks/usePageTitle';
import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();
  usePageTitle(t('footer.privacy'));

  return (
    <article className="public-invert max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: May 2026</em>
      </p>

      <p>
        FOKUS Award (the "Award", "we", "us") respects the privacy of every
        photographer, jury member and visitor who uses fokusaward.com (the
        "Site"). This page explains what personal data we collect, why we
        collect it, and the rights you have over it under the EU General Data
        Protection Regulation (GDPR) and applicable Albanian data-protection
        law.
      </p>

      <h2>1. Who we are</h2>
      <p>
        FOKUS Award is operated from Tirana, Albania. For any privacy-related
        request, please contact us at <a href="mailto:info@fokusaward.com">info@fokusaward.com</a>.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> full name, email address, country and
          (optionally) a profile picture, bio, website and Instagram handle that
          you provide when you register.
        </li>
        <li>
          <strong>Submission data:</strong> photographs you upload, their
          metadata (EXIF), titles and descriptions, and the category / edition
          you submit them to.
        </li>
        <li>
          <strong>Payment data:</strong> we do not store credit-card details.
          PayPal handles the transaction; we keep only the order id, capture
          id, payer email and amount necessary for tax and refund records.
        </li>
        <li>
          <strong>Technical data:</strong> standard server logs (IP address,
          user-agent, timestamps) for fraud and abuse prevention. Logs are
          retained for 90 days.
        </li>
      </ul>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To run the competition: registration, submission, jury review, and publication of results.</li>
        <li>To send transactional emails about your account and submissions.</li>
        <li>To prevent abuse and comply with legal obligations.</li>
      </ul>

      <h2>4. Legal basis</h2>
      <p>
        We rely on <strong>contract</strong> (Art. 6(1)(b) GDPR) for account and
        submission processing, <strong>legitimate interest</strong> (Art. 6(1)(f))
        for security logs, and <strong>your explicit consent</strong> for any
        optional newsletter or marketing communications. You can withdraw
        consent at any time.
      </p>

      <h2>5. Sharing</h2>
      <p>We share data only with processors strictly required to operate the Site:</p>
      <ul>
        <li>Supabase (database & authentication) — EU region.</li>
        <li>Cloudflare R2 (photo storage).</li>
        <li>PayPal (payments).</li>
        <li>Resend (transactional email).</li>
      </ul>
      <p>
        Public-facing data (your display name and your accepted photographs
        once results are published) becomes visible on fokusaward.com. We do
        not publish your email or country without explicit consent.
      </p>

      <h2>6. Retention</h2>
      <p>
        Account data is retained for as long as your account exists. You can
        request deletion at any time. Payment and tax records are kept for the
        legally-required period (currently 10 years in Albania).
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under GDPR you have the right to <strong>access</strong>, <strong>rectify</strong>,
        <strong> erase</strong> or <strong>port</strong> your data, to object to
        processing, and to lodge a complaint with the supervisory authority.
        Send any such request to <a href="mailto:info@fokusaward.com">info@fokusaward.com</a>
        and we will respond within 30 days.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use only the cookies strictly required to keep you logged in. No
        third-party analytics or advertising cookies are set.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be
        announced on the Site at least 14 days before they take effect.
      </p>
    </article>
  );
}
