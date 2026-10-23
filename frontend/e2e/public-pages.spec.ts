import { expect, test } from '@playwright/test';
import pages from '../src/seo/pages.json';

const paths = Object.keys(pages) as (keyof typeof pages)[];

for (const path of paths) {
  test(`${path} renders with its own metadata @mobile`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(path);
    const seo = pages[path];
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page).toHaveTitle(new RegExp(seo.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path === '/' ? '/' : path}$`));
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', seo.description);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('unknown path shows the 404 page and is noindex', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { level: 1, name: /could not find/i })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('skip link moves focus to the main content', async ({ page }) => {
  // The cookie notice sits before the layout in the DOM, so dismiss it first.
  await page.addInitScript(() => localStorage.setItem('vf-cookie-consent', 'accepted'));
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('client navigation updates title and canonical', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Tools' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page).toHaveTitle(/Free fitness calculators/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/tools$/);
});

test('FAQ page publishes FAQPage structured data', async ({ page }) => {
  await page.goto('/faq');
  const ld = await page.locator('script#page-jsonld').textContent();
  expect(ld).toContain('FAQPage');
  expect(ld).toContain('BreadcrumbList');
});

test('contact form validates before sending', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
});

test('gym directory lists gyms and opens a detail page', async ({ page, request }) => {
  const apiUrl = process.env.API_URL ?? 'http://localhost:5000/api';
  const res = await request.get(`${apiUrl}/gym`).catch(() => null);
  test.skip(!res?.ok(), 'API is not running');
  const gyms = (await res!.json()) as { id: string; name: string }[];
  test.skip(gyms.length === 0, 'no approved gyms in this database');
  const detail = await request.get(`${apiUrl}/public/gyms/${gyms[0].id}`);
  test.skip(!detail.ok(), 'public gym endpoint is not available');

  await page.goto('/gyms');
  await page.getByRole('link', { name: gyms[0].name }).first().click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${gyms[0].id}$`));
  await expect(page.getByRole('heading', { level: 1, name: gyms[0].name })).toBeVisible();
  expect(await page.locator('script#page-jsonld').textContent()).toContain('ExerciseGym');
});

test('unknown gym id shows a not-listed message', async ({ page }) => {
  await page.goto('/gyms/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('heading', { name: /not listed|could not load/i })).toBeVisible();
});

test('static files are served', async ({ request }) => {
  for (const file of ['/robots.txt', '/llms.txt', '/manifest.webmanifest', '/sw.js', '/og-image.png']) {
    const res = await request.get(file);
    expect(res.ok(), file).toBeTruthy();
  }
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
});

test('gym detail page renders the public gym payload', async ({ page }) => {
  await page.route('**/api/public/gyms/*', (route) =>
    route.fulfill({
      json: {
        id: 'g1', name: 'Test Strength Club', tagline: 'Barbells and coaching', address: '4 Station Road', city: 'Indore', state: 'Madhya Pradesh',
        location: 'Indore', facilities: 'Free weights, Showers', brandColor: null, imageUrl: null, logoUrl: null,
        branches: [{ id: 'b1', name: 'Main', city: 'Indore' }],
        plans: [{ id: 'p1', name: 'Quarterly', description: 'Three months', price: 4500, duration: 90 }],
        trainerCount: 1, trainers: [{ name: 'Asha', specialization: 'Strength', experienceYears: 6 }],
      },
    }),
  );
  await page.goto('/gyms/g1');
  await expect(page.getByRole('heading', { level: 1, name: 'Test Strength Club' })).toBeVisible();
  await expect(page.getByText('₹4,500')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join this gym' })).toHaveAttribute('href', '/register/member?gym=g1');
  await expect(page).toHaveTitle(/Test Strength Club, Indore/);
  expect(await page.locator('script#page-jsonld').textContent()).toContain('ExerciseGym');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
});
