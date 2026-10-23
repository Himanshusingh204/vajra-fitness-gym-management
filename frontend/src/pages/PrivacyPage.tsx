import { Link } from 'react-router';
import { LegalPage, LegalSection } from '../components/LegalPage';

const link = 'font-medium text-accent-ink underline underline-offset-2';

export default function PrivacyPage() {
  return (
    <LegalPage path="/privacy" updated="23 October 2026">
      <LegalSection title="1. What we collect">
        <p>When you register or use Vajra Fitness we collect your name, email address, mobile number and the gym you belong to. Members and trainers may also add details such as body measurements or workout logs. Card and bank details are handled by Razorpay and are not stored on our servers.</p>
      </LegalSection>
      <LegalSection title="2. How we use it">
        <p>We use your data to run the service: membership records, attendance, fee receipts and service messages. We do not sell personal data.</p>
      </LegalSection>
      <LegalSection title="3. Security">
        <p>Data is encrypted in transit and passwords are hashed. Access to production systems is limited to authorised staff. We handle personal data in line with the Digital Personal Data Protection Act, 2023.</p>
      </LegalSection>
      <LegalSection title="4. How long we keep it">
        <p>Member and payment records are kept for at least 3 years because Indian GST rules require it. You can ask us to delete your account through the <Link to="/contact" className={link}>contact form</Link>. Financial records are kept for as long as the law requires.</p>
      </LegalSection>
      <LegalSection title="5. Cookies and storage">
        <p>We use one cookie to keep you signed in and browser storage for your theme and cookie notice. We use no advertising or tracking cookies. The <Link to="/cookies" className={link}>cookie policy</Link> lists each item.</p>
      </LegalSection>
      <LegalSection title="6. Service providers">
        <p>We rely on Razorpay for payments, Neon for database hosting, Upstash for caching and Vercel for hosting, plus Vercel Analytics and Speed Insights for page-view and performance counts that do not follow you across sites. Each has its own privacy policy.</p>
      </LegalSection>
      <LegalSection title="7. Questions">
        <p>For privacy questions or requests, use the <Link to="/contact" className={link}>contact form</Link> and mention privacy in the subject.</p>
      </LegalSection>
    </LegalPage>
  );
}
