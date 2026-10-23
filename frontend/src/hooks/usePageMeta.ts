import { useEffect } from 'react';

const SITE_NAME = 'Vajra Fitness';
const DEFAULT_TITLE = 'Vajra Fitness - Enterprise Gym Management Platform';
const DEFAULT_DESCRIPTION =
  'Enterprise gym management platform for Indian fitness businesses. Manage memberships, automate payments, assign workout slips, and scale.';
const SITE_URL = 'https://vajrafitness.in';

const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

// Lightweight per-page SEO. Call with a title (with or without the site name)
// and an optional description; everything else derives from it. Safe to call
// from any client-rendered public page.
export function usePageMeta(title?: string, description?: string, path = '') {
  useEffect(() => {
    const fullTitle = title ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`) : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const canonical = `${SITE_URL}${path}`;

    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setCanonical(canonical);

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', canonical);

    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
  }, [title, description, path]);
}
