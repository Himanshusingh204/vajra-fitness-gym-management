// Runs Lighthouse on key public pages against BASE_URL (default http://localhost:4173) and writes JSON reports
// to lighthouse-reports/. Chrome comes from Playwright, so no extra browser install is needed.
import { mkdirSync, writeFileSync } from 'node:fs';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:4173').replace(/\/$/, '');
const PAGES = ['/', '/gyms', '/subscription', '/tools/bmi-calculator', '/faq'];
// Performance on a shared CI runner is noisy, so it only warns. The other categories must hold.
const MIN = { accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 };
const PERF_WARN = 0.7;
const PORT = 9223;

mkdirSync('lighthouse-reports', { recursive: true });
const browser = await chromium.launch({ args: [`--remote-debugging-port=${PORT}`] });
let failed = false;

try {
  for (const path of PAGES) {
    const run = await lighthouse(`${base}${path}`, {
      port: PORT,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    const { lhr, report } = run;
    const slug = path === '/' ? 'home' : path.slice(1).replace(/\//g, '-');
    writeFileSync(`lighthouse-reports/${slug}.json`, report);

    const scores = Object.fromEntries(Object.entries(lhr.categories).map(([id, c]) => [id, c.score ?? 0]));
    console.log(`${path.padEnd(26)} ${Object.entries(scores).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join('  ')}`);
    if (scores.performance < PERF_WARN) console.warn(`  warning: performance below ${PERF_WARN * 100}`);
    for (const [id, min] of Object.entries(MIN)) {
      if (scores[id] < min) {
        failed = true;
        console.error(`  fail: ${id} ${Math.round(scores[id] * 100)} is below ${min * 100}`);
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
