import { useEffect } from 'react';
import pages from '../seo/pages.json';

const SITE_NAME = 'Vajra Fitness';
const DEFAULT_TITLE = 'Vajra Fitness - Gym management software for Indian gyms';
const DEFAULT_DESCRIPTION =
  'Vajra Fitness helps gym owners run memberships, fee collection, attendance, trainers and workout plans from one place, and helps members find a gym to join.';
export const SITE_URL = 'https://vajra-fitness-gym-management.vercel.app';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

type PageSeo = { name: string; title: string; description: string; h1: string; summary: string };
export const pageSeo = pages as Record<string, PageSeo>;

type MetaOptions = {
  noindex?: boolean;
  image?: string;
  /** Extra schema.org objects for this page; the breadcrumb is added automatically. */
  jsonLd?: object[];
};

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

const breadcrumb = (path: string) => {
  const parts = path.split('/').filter(Boolean);
  const trail = [{ name: 'Home', url: `${SITE_URL}/` }];
  parts.forEach((_, i) => {
    const p = `/${parts.slice(0, i + 1).join('/')}`;
    const name = pageSeo[p]?.name;
    if (name) trail.push({ name, url: `${SITE_URL}${p}` });
  });
  if (trail.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.url })),
  };
};

const JSON_LD_ID = 'page-jsonld';

// Per-page SEO for client-rendered routes. Title may include the site name or not.
export function usePageMeta(title?: string, description?: string, path = '', options: MetaOptions = {}) {
  const { noindex = false, image } = options;
  const ldKey = JSON.stringify(options.jsonLd ?? []);

  useEffect(() => {
    const fullTitle = title ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`) : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const canonical = `${SITE_URL}${path}`;
    const ogImage = image ?? DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setCanonical(canonical);

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', ogImage);

    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', ogImage);

    const graph = [...(JSON.parse(ldKey) as object[]), breadcrumb(path)].filter(Boolean);
    document.getElementById(JSON_LD_ID)?.remove();
    if (graph.length) {
      const script = document.createElement('script');
      script.id = JSON_LD_ID;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(graph);
      document.head.appendChild(script);
    }
    return () => document.getElementById(JSON_LD_ID)?.remove();
  }, [title, description, path, noindex, image, ldKey]);
}

/** Meta for a route listed in seo/pages.json. */
export function useRouteMeta(path: string, jsonLd?: object[]) {
  const seo = pageSeo[path];
  usePageMeta(seo.title, seo.description, path, { jsonLd });
}
