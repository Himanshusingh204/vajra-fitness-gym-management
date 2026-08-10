import React from 'react';
import { useLocation } from 'react-router';

/**
 * Fades + slides page content in on every route change. The wrapper is keyed by
 * pathname so React remounts it on navigation, re-triggering the CSS animation
 * while keeping the actual route component's mounting behaviour untouched.
 * Reduced-motion users get the animation stripped by the global CSS media query.
 */
export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page">
      {children}
    </div>
  );
};

export default PageTransition;
