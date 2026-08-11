import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Test database: separate from the dev DB so tests never touch real data.
// Override with TEST_DATABASE_URL if your local Postgres credentials differ.
const TEST_DB = process.env.TEST_DATABASE_URL || 'postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness_test?schema=public';
const dbName = (TEST_DB.match(/\/([^/?#]+)\?/) || [])[1] ?? 'vajra_fitness_test';
// Connect to the shared "postgres" maintenance DB with the same credentials.
const maintenanceUrl = TEST_DB.replace(/\/[^/?#]+/, '/postgres');

export default async function setup() {
  // Create the test database if it doesn't exist yet.
  process.env.DATABASE_URL = maintenanceUrl;
  const admin = new PrismaClient();
  try {
    await admin.$connect();
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch {
    // Database already exists — fine.
  } finally {
    await admin.$disconnect();
    process.env.DATABASE_URL = TEST_DB;
  }

  // Push the Prisma schema into the test DB.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });

  return async () => {
    // Leave the test database in place for faster local iteration; it is truncated
    // before every suite via tests/setup.ts.
  };
}
