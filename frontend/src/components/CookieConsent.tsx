import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Cookie } from 'lucide-react';

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
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-md z-[100] glass-strong rounded-2xl p-5 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="text-sm">
          <p className="font-bold text-[var(--color-deepgray)] dark:text-white mb-1">Cookies on Vajra Fitness</p>
          <p className="text-[var(--color-muted)] leading-relaxed mb-3">
            We use essential cookies to keep you signed in and remember your preferences.
            We do not set advertising or tracking cookies. See our{' '}
            <Link to="/cookies" className="text-[var(--color-primary)] font-semibold hover:underline">
              Cookie Policy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={accept}
            className="btn-primary text-sm px-4 py-2 rounded-xl"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
