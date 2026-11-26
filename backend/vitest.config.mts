import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';

const TEST_DB = process.env.TEST_DATABASE_URL || 'postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness_test?schema=public';

// Global setup pushes schema with data loss and workers truncate tables. Refuse
// remote/shared or non-test targets before Prisma can make any connection.
const testTarget = new URL(TEST_DB);
if (!['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(testTarget.hostname)
  || !/^\/(?:[a-zA-Z0-9]+_)*test(?:_[a-zA-Z0-9]+)*$/.test(testTarget.pathname)
  || !['postgres:', 'postgresql:'].includes(testTarget.protocol)) {
  throw new Error('TEST_DATABASE_URL must point to a dedicated local PostgreSQL test database');
}

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
      UPLOAD_DIR: path.join(os.tmpdir(), 'kavach-test-uploads'),
    },
    fileParallelism: false,
    isolate: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
  },
});
