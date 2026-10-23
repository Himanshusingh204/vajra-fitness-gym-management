// Writes a static copy of dist/index.html for every public route with its own title, description,
// canonical, social tags and JSON-LD, so crawlers that skip JavaScript still see real metadata.
// Runs after `vite build`. It never fails the build: on any error it logs and leaves dist as vite made it.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://vajra-fitness-gym-management.vercel.app').replace(/\/$/, '');
const SITE_NAME = 'Vajra Fitness';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

// Routes that should never be indexed. They still get a copy so the title is right.
const PRIVATE = {
  '/login': 'Log in',
  '/register': 'Create an account',
  '/register/member': 'Join as a member',
  '/register/trainer': 'Join as a trainer',
  '/register/partner': 'Register your gym',
  '/forgot-password': 'Reset your password',
  '/reset-password': 'Choose a new password',
  '/activate': 'Activate your account',
};

const swap = (html, pattern, replacement) => (pattern.test(html) ? html.replace(pattern, () => replacement) : html);

function breadcrumb(path, pages) {
  const parts = path.split('/').filter(Boolean);
  const trail = [{ name: 'Home', url: `${SITE_URL}/` }];
  parts.forEach((_, i) => {
    const p = `/${parts.slice(0, i + 1).join('/')}`;
    if (pages[p]) trail.push({ name: pages[p].name, url: `${SITE_URL}${p}` });
  });
  if (trail.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.url })),
  };
}

function structuredData(path, seo, pages, faqs) {
  const graph = [];
  if (path === '/') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: seo.description,
    });
  }
  if (path.startsWith('/tools/')) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: seo.h1,
      description: seo.description,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    });
  }
  if (path === '/faq') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  const crumbs = breadcrumb(path, pages);
  if (crumbs) graph.push(crumbs);
  return graph;
}

function render(template, { path, title, description, noindex, graph, h1, summary }) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path === '/' ? '/' : path}`;
  let html = template;
  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = swap(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`);
  html = swap(html, /<meta name="robots"[^>]*>/, `<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow'}" />`);
  html = swap(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  html = swap(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(fullTitle)}" />`);
  html = swap(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`);
  html = swap(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  html = swap(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(fullTitle)}" />`);
  html = swap(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`);

  const extras = graph.length
    ? `    <script id="page-jsonld" type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>\n`
    : '';
  html = html.replace('</head>', () => `${extras}  </head>`);

  if (h1) {
    const links = Object.entries(PAGES_FOR_NAV)
      .map(([p, s]) => `<li><a href="${p}">${esc(s.name)}</a></li>`)
      .join('');
    const body = `<noscript><h1>${esc(h1)}</h1><p>${esc(summary)}</p><nav aria-label="Main"><ul>${links}</ul></nav></noscript>`;
    html = html.replace('<div id="root"></div>', () => `${body}\n    <div id="root"></div>`);
  }
  return html;
}

let PAGES_FOR_NAV = {};

function main() {
  const indexPath = join(dist, 'index.html');
  if (!existsSync(indexPath)) {
    console.warn('prerender: dist/index.html not found, skipping');
    return;
  }
  const template = readFileSync(indexPath, 'utf8');

  // Hosts that serve 404.html use it for unknown paths.
  try {
    writeFileSync(join(dist, '404.html'), render(template, {
      path: '/404', title: 'Page not found', description: 'This page does not exist or has moved.', noindex: true, graph: [],
    }));
  } catch {
    copyFileSync(indexPath, join(dist, '404.html'));
  }

  const pages = readJson('src/seo/pages.json');
  const faqs = readJson('src/seo/faqs.json');
  PAGES_FOR_NAV = pages;

  const write = (path, html) => {
    const dir = path === '/' ? dist : join(dist, ...path.split('/').filter(Boolean));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  };

  let count = 0;
  for (const [path, seo] of Object.entries(pages)) {
    write(path, render(template, {
      path,
      title: seo.title,
      description: seo.description,
      noindex: false,
      graph: structuredData(path, seo, pages, faqs),
      h1: seo.h1,
      summary: seo.summary,
    }));
    count += 1;
  }
  for (const [path, title] of Object.entries(PRIVATE)) {
    write(path, render(template, { path, title, description: `${title} on ${SITE_NAME}.`, noindex: true, graph: [] }));
    count += 1;
  }
  console.log(`prerender: wrote ${count} pages and 404.html`);
}

try {
  main();
} catch (err) {
  console.warn('prerender: skipped,', err instanceof Error ? err.message : err);
}
