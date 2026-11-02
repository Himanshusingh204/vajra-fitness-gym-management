import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4173' },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true },
});
