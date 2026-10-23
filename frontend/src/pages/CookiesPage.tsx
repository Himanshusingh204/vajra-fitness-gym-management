import { Link } from 'react-router';
import { LegalPage, LegalSection } from '../components/LegalPage';

const link = 'font-medium text-accent-ink underline underline-offset-2';

export default function CookiesPage() {
  return (
    <LegalPage path="/cookies" updated="23 October 2026">
      <LegalSection title="1. What we store on your device">
        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-ink">refreshToken</strong>: an httpOnly cookie that keeps you signed in. It never holds your password and scripts cannot read it.</li>
          <li><strong className="text-ink">vf-theme</strong>: your light or dark choice, kept in browser storage.</li>
          <li><strong className="text-ink">vf-cookie-consent</strong>: remembers that you have seen this notice.</li>
        </ul>
      </LegalSection>
      <LegalSection title="2. Tracking and advertising">
        <p>We do not set advertising or cross-site tracking cookies. Vercel Analytics and Speed Insights count page views and performance without cookies.</p>
      </LegalSection>
      <LegalSection title="3. Payments">
        <p>When you pay online, Razorpay loads on the checkout step and may set its own cookies under its own policy.</p>
      </LegalSection>
      <LegalSection title="4. Managing cookies">
        <p>The sign-in cookie is needed to stay logged in. You can clear cookies and site data in your browser settings at any time. More about your data is in the <Link to="/privacy" className={link}>privacy policy</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
