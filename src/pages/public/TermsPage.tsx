import { usePageTitle } from '@/hooks/usePageTitle';
import { useTranslation } from 'react-i18next';

export default function TermsPage() {
  const { t } = useTranslation();
  usePageTitle(t('footer.terms'));

  return (
    <article className="public-invert max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1>Terms & Conditions</h1>
      <p>
        <em>Last updated: May 2026</em>
      </p>

      <p>
        By using fokusaward.com (the "Site") or submitting an entry to FOKUS
        Award (the "Award") you agree to these Terms. If you do not agree,
        please do not use the Site or submit entries.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old (or have explicit guardian consent)
        and the lawful copyright holder of every photograph you submit.
        Employees and immediate family of FOKUS Award and its sponsors are
        not eligible for prizes.
      </p>

      <h2>2. Account</h2>
      <p>
        You are responsible for keeping your password secure and for all
        activity carried out with your account. Please notify us immediately
        of any unauthorised use.
      </p>

      <h2>3. Submissions</h2>
      <ul>
        <li>You retain full copyright on every photograph you submit.</li>
        <li>
          You grant FOKUS Award a non-exclusive, royalty-free, worldwide
          licence to display, reproduce and promote your accepted submissions
          on the Site, in promotional materials, and at exhibitions, with
          attribution to you as the author.
        </li>
        <li>
          Photographs must be your original work and must not infringe any
          third-party rights. Heavily-manipulated composites must be disclosed
          in the description.
        </li>
        <li>
          We reserve the right to disqualify any submission that violates the
          rules or applicable law.
        </li>
      </ul>

      <h2>4. Entry fees & refunds</h2>
      <p>
        Entry fees are processed by PayPal and are non-refundable once a
        submission has been received, except where required by law or where a
        payment was captured in error (mismatched amount, duplicate capture,
        etc.). Mistaken charges are refunded automatically; please contact us
        for any other case.
      </p>

      <h2>5. Judging</h2>
      <p>
        Submissions are reviewed by an independent jury. Jury decisions are
        final. The Award does not disclose individual jury scores or comments.
      </p>

      <h2>6. Prizes</h2>
      <p>
        Prizes are awarded as described in each edition's rules page. Cash
        prizes are subject to applicable taxes, which are the recipient's
        responsibility. The Award reserves the right to substitute a prize of
        equivalent or higher value if necessary.
      </p>

      <h2>7. Liability</h2>
      <p>
        The Site is provided "as is". To the maximum extent permitted by law,
        FOKUS Award is not liable for indirect or consequential damages
        arising from your use of the Site or participation in the Award.
      </p>

      <h2>8. Termination</h2>
      <p>
        We may suspend or terminate any account that violates these Terms or
        applicable law, at our sole discretion. You may delete your account at
        any time from your profile settings.
      </p>

      <h2>9. Privacy</h2>
      <p>
        Your data is handled in accordance with our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of Albania. Disputes will be
        submitted to the competent courts of Tirana.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href="mailto:info@fokusaward.com">info@fokusaward.com</a>.
      </p>
    </article>
  );
}
