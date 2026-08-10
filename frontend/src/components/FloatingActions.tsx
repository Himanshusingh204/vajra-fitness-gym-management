import React, { useState, useEffect } from 'react';
import { ArrowUp, Mail } from 'lucide-react';

const WHATSAPP_NUMBER = '919876543210';
const WHATSAPP_MESSAGE =
  encodeURIComponent('Hi Vajra Fitness! I would like to know more about your memberships.');

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.47 1.72 6.42L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.63h.01c7.06 0 12.79-5.74 12.79-12.8 0-3.42-1.33-6.63-3.75-9.05a12.72 12.72 0 0 0-9.05-3.66Zm0 23.36h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.02 1.05 1.07-3.92-.25-.39a10.55 10.55 0 0 1-1.62-5.66c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.11 7.52 3.12a10.57 10.57 0 0 1 3.11 7.52c0 5.87-4.77 10.62-10.65 10.62Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.48 4.84.77.33 1.37.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

export function FloatingActions() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {/* Support Button */}
      <a
        href="mailto:support@vajrafitness.in"
        className="group flex items-center gap-2"
        title="Email Support"
        aria-label="Email Vajra Fitness support"
      >
        <span className="text-xs font-semibold bg-[var(--color-base)] border border-gray-200 dark:border-white/10 text-[var(--color-charcoal)] px-3 py-1.5 rounded-lg shadow-lg opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
          Email us
        </span>
        <span className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center hover:-translate-y-1 hover:shadow-[var(--color-primary)]/40 transition-all duration-300">
          <Mail className="w-6 h-6" />
        </span>
      </a>

      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-2"
        title="Chat on WhatsApp"
        aria-label="Chat with us on WhatsApp"
      >
        <span className="text-xs font-semibold bg-white text-gray-800 px-3 py-1.5 rounded-lg shadow-lg opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap">
          Chat with us
        </span>
        <span className="relative">
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
          <span className="relative w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300">
            <WhatsAppIcon className="w-7 h-7" />
          </span>
        </span>
      </a>

      {/* Back to Top */}
      <button
        onClick={scrollToTop}
        className={`w-12 h-12 rounded-full bg-[var(--color-surface)] border border-gray-200 dark:border-white/10 text-[var(--color-charcoal)] shadow-lg flex items-center justify-center hover:-translate-y-1 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        title="Back to Top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>
    </div>
  );
}
