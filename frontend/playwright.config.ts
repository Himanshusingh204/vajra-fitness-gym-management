import { defineConfig, devices } from '@playwright/test';

// BASE_URL and API_URL come from the CI workflow. Locally, build once and the config serves dist on 4173.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npx vite preview --port 4173 --strictPort', url: baseURL, reuseExistingServer: true },
});
