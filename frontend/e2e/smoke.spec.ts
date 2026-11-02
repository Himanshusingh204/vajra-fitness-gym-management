import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Kavach/i);
  await expect(page.locator('main')).toBeVisible();
});

test('login form inputs have labels', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email', { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true }).first()).toBeVisible();
});

test('theme toggle switches the theme', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).first().click();
  const isDark = await html.evaluate((el) => el.classList.contains('dark'));
  expect(isDark).toBe(!wasDark);
});

test('home, gym directory, and account pages fit phone, tablet, and desktop widths', async ({ page }) => {
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/gyms', '/login', '/register/member']) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `${path} overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    }
  }
});
