import { useState } from 'react';
import { Link } from 'react-router';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'vf-cookie-consent';

// Kavach Fitness only sets essential cookies (the httpOnly refresh-token cookie
// that keeps you signed in, and a theme preference). We still show a one-time
// notice for transparency and to stay compatible with cookie-consent law.
const CookieConsent = () => {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(CONSENT_KEY);
    } catch {
      return true;
    }
  });

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
      className="fixed inset-x-0 bottom-0 z-[100] glass-strong border-x-0 border-b-0 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md sm:rounded-2xl sm:border sm:p-5"
    >
      <div className="flex items-center gap-3 sm:items-start">
        <div className="hidden w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] items-center justify-center shrink-0 sm:flex">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3 text-sm sm:block">
          <p className="hidden font-bold text-[var(--color-deepgray)] dark:text-white mb-1 sm:block">Cookies on Kavach Fitness</p>
          <p className="min-w-0 flex-1 text-xs leading-snug text-[var(--color-muted)] sm:mb-3 sm:text-sm sm:leading-relaxed">
            <span className="sm:hidden">Essential cookies only, no tracking. </span>
            <span className="hidden sm:inline">
              We use essential cookies to keep you signed in and remember your preferences.
              We do not set advertising or tracking cookies.{' '}
            </span>
            See our{' '}
            <Link to="/cookies" className="text-[var(--color-primary)] font-semibold hover:underline">
              Cookie Policy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={accept}
            className="btn-primary min-h-11 shrink-0 text-sm px-4 py-2 rounded-xl"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
