// Static SEO audit of the built site. Run `npm run build` first, then `npm run audit:seo`.
// Exits 1 when any check fails.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

if (!existsSync(dist)) {
  console.error('audit-seo: dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

const pages = JSON.parse(readFileSync(join(root, 'src/seo/pages.json'), 'utf8'));
const tag = (html, re) => html.match(re)?.[1];
const meta = (html, attr, key) => tag(html, new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));

const seenTitles = new Map();
const seenDescriptions = new Map();

for (const path of Object.keys(pages)) {
  const file = path === '/' ? join(dist, 'index.html') : join(dist, ...path.split('/').filter(Boolean), 'index.html');
  if (!existsSync(file)) {
    fail(path, 'no prerendered file');
    continue;
  }
  const html = readFileSync(file, 'utf8');

  const title = tag(html, /<title>([^<]*)<\/title>/);
  if (!title) fail(path, 'missing title');
  else if (title.length < 15 || title.length > 70) fail(path, `title length ${title.length} (want 15 to 70)`);
  else if (seenTitles.has(title)) fail(path, `title repeats ${seenTitles.get(title)}`);
  else seenTitles.set(title, path);

  const description = meta(html, 'name', 'description');
  if (!description) fail(path, 'missing meta description');
  else if (description.length < 70 || description.length > 175) fail(path, `description length ${description.length} (want 70 to 175)`);
  else if (seenDescriptions.has(description)) fail(path, `description repeats ${seenDescriptions.get(description)}`);
  else seenDescriptions.set(description, path);

  const canonical = tag(html, /<link rel="canonical" href="([^"]*)"/);
  if (!canonical?.startsWith('https://')) fail(path, 'canonical missing or not absolute https');
  else if (new URL(canonical).pathname !== path) fail(path, `canonical points at ${canonical}`);

  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!meta(html, 'property', prop)) fail(path, `missing ${prop}`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:image']) {
    if (!meta(html, 'name', name)) fail(path, `missing ${name}`);
  }
  if (meta(html, 'name', 'robots')?.includes('noindex')) fail(path, 'public page is noindex');
  if (!/<html lang="[a-z-]+"/i.test(html)) fail(path, 'html lang missing');
  if (/[–—]/.test(`${title}${description}`)) fail(path, 'dash character in title or description');

  const h1s = (html.match(/<h1[ >]/g) || []).length;
  if (path !== '/' && h1s !== 1) fail(path, `expected one h1 in the static copy, found ${h1s}`);

  for (const [, body] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(body);
    } catch {
      fail(path, 'JSON-LD does not parse');
    }
  }
  if (path === '/faq' && !html.includes('FAQPage')) fail(path, 'FAQPage JSON-LD missing');
}

// Notfound copy must be noindex.
const notFound = join(dist, '404.html');
if (!existsSync(notFound)) fail('404.html', 'missing');
else if (!meta(readFileSync(notFound, 'utf8'), 'name', 'robots')?.includes('noindex')) fail('404.html', 'not noindex');

const robots = existsSync(join(dist, 'robots.txt')) ? readFileSync(join(dist, 'robots.txt'), 'utf8') : '';
if (!/^Sitemap: https:\/\/\S+\/sitemap\.xml$/m.test(robots)) fail('robots.txt', 'Sitemap line missing');
if (/vajrafitness\.in/.test(robots)) fail('robots.txt', 'still points at the old domain');
if (!existsSync(join(dist, 'llms.txt'))) fail('llms.txt', 'missing');

const manifestFile = join(dist, 'manifest.webmanifest');
if (!existsSync(manifestFile)) fail('manifest', 'missing');
else {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  if (!manifest.icons?.some((i) => i.purpose === 'maskable')) fail('manifest', 'no maskable icon');
  for (const icon of manifest.icons ?? []) {
    if (!existsSync(join(dist, icon.src))) fail('manifest', `icon ${icon.src} not in dist`);
  }
}
if (!existsSync(join(dist, 'sw.js'))) fail('sw.js', 'missing');

// Every <img> in the source needs an alt attribute (empty is fine for decoration).
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });
for (const file of walk(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8');
  for (const [tagText] of src.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(tagText)) fail(relative(root, file).split(sep).join('/'), 'img without alt');
  }
}

if (failures.length) {
  console.error(`audit-seo: ${failures.length} problem(s)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`audit-seo: ${Object.keys(pages).length} pages passed`);
