// Regenerates the README screenshots from the live production site.
// Run from the repo root: node docs/screenshots/capture.mjs
// (requires Playwright's Chromium: npx playwright install chromium)
import { chromium } from 'playwright';

const BASE = 'https://vajra-fitness-gym-management.vercel.app';
const OUT = 'docs/screenshots';

const pages = [
  { path: '/', name: 'homepage', scrollY: 0 },
  { path: '/subscription', name: 'subscription', scrollY: 420 },
  { path: '/about', name: 'about', scrollY: 0 },
  { path: '/login', name: 'login', scrollY: 0 },
];

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  for (const p of pages) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    // Dismiss the cookie-consent banner so it doesn't cover the shot.
    const gotIt = page.getByRole('button', { name: 'Got it' });
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
    if (p.scrollY) await page.evaluate((y) => window.scrollTo(0, y), p.scrollY);
    await page.waitForTimeout(800); // let reveal animations settle
    await page.screenshot({ path: `${OUT}/${p.name}.png`, fullPage: false });
    console.log(`captured ${p.name}`);
  }

  await browser.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
