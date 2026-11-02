// `npm run dev:local`: the API against the local Postgres QA database instead
// of whatever DATABASE_URL in .env points at (Neon). Set LOCAL_DATABASE_URL to
// use another local database. Variables already in the environment win over
// .env, so the rest of .env (JWT_SECRET, SMTP...) still applies.
import { spawn } from 'node:child_process';

const url = process.env.LOCAL_DATABASE_URL || 'postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness_qa?schema=public';
const { hostname } = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
  console.error(`dev:local only runs against a localhost database, got "${hostname}".`);
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: url,
  // Keep local runs off the shared Redis; rate limits and cache fall back to memory.
  REDIS_URL: '',
};

spawn('npx tsx watch src/server.ts', { stdio: 'inherit', shell: true, env }).on('exit', (code) => process.exit(code ?? 0));
