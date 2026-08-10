import { defineConfig } from 'vitest/config';

const TEST_DB = process.env.TEST_DATABASE_URL || 'postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DB,
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long!!',
      FRONTEND_URL: 'http://localhost:5173',
    },
    fileParallelism: false,
    isolate: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
  },
});
