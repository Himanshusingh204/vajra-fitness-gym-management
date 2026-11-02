import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  '/', '/about', '/gyms', '/membership', '/contact', '/help', '/faq',
  '/terms', '/privacy', '/refund', '/cookies', '/login', '/forgot-password',
  '/reset-password', '/activate', '/register/member', '/partner/login',
  '/partner/register', '/trainer/login', '/trainer/register', '/admin/login', '/register',
];

for (const path of publicRoutes) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([]);
  });
}
