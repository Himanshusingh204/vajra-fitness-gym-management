import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import pages from '../src/seo/pages.json';

// Run with `npm run audit:a11y`. Also writes a screenshot of every page to screenshots/.
const paths = ['/login', '/register', ...Object.keys(pages)];

for (const theme of ['light', 'dark'] as const) {
  for (const path of paths) {
    test(`@a11y ${path} (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const name = `${path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')}-${theme}`;
      await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });

      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });
  }
}
