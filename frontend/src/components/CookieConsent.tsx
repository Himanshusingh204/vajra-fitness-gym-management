import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from './ui/Button';

const CONSENT_KEY = 'vf-cookie-consent';

// Vajra Fitness only sets essential cookies (the httpOnly refresh-token cookie
// that keeps you signed in, and a theme preference). We still show a one-time
// notice for transparency and to stay compatible with cookie-consent law.
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-50 rounded-card border border-line bg-surface-raised p-5 shadow-overlay sm:left-auto sm:max-w-md"
    >
      <p className="mb-1 text-sm font-semibold text-ink">Cookies on Vajra Fitness</p>
      <p className="mb-3 text-sm leading-relaxed text-ink-muted">
        We use essential cookies to keep you signed in and remember your preferences. We do not set advertising or
        tracking cookies. See our{' '}
        <Link to="/cookies" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          cookie policy
        </Link>
        .
      </p>
      <Button size="sm" onClick={accept}>
        Got it
      </Button>
    </section>
  );
};

export default CookieConsent;
