// Creates the local dev database, pushes the Prisma schema and loads the demo seed.
//   node scripts/dev-db.mjs
// Override the target with DATABASE_URL, but only localhost is accepted.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const require = createRequire(path.join(backendDir, 'package.json'));

const DEFAULT_URL = 'postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness_dev?schema=public';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const databaseUrl = process.env.DATABASE_URL || DEFAULT_URL;

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL is not a valid connection string.');
  process.exit(1);
}

if (databaseUrl.includes('neon.tech') || !LOCAL_HOSTS.has(parsed.hostname)) {
  console.error(`Refusing to run against host "${parsed.hostname}". This script only touches localhost databases.`);
  process.exit(1);
}

const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  console.error('Database name may only contain letters, digits and underscores.');
  process.exit(1);
}

const maintenance = new URL(databaseUrl);
maintenance.pathname = '/postgres';

async function createDatabase() {
  const { PrismaClient } = require('@prisma/client');
  const admin = new PrismaClient({ datasourceUrl: maintenance.toString() });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database ${dbName}`);
  } catch (err) {
    if (!String(err?.message).includes('already exists')) throw err;
    console.log(`Database ${dbName} already exists`);
  } finally {
    await admin.$disconnect();
  }
}

function run(args, extraEnv = {}) {
  const result = spawnSync(`npm ${args.join(' ')}`, {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL: databaseUrl, ...extraEnv },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  await createDatabase();
} catch (err) {
  console.error(`Could not reach Postgres on ${parsed.host}: ${err.message}`);
  process.exit(1);
}

run(['exec', '--', 'prisma', 'db', 'push', '--skip-generate']);
run(['run', 'seed'], { NODE_ENV: 'development' });

console.log(`\nDev database "${dbName}" is ready on ${parsed.host}.`);
console.log('Export DATABASE_URL in your shell to use it; do not put it in backend/.env.');
