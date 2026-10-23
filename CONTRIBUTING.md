# Contributing

VajraFitness is proprietary software (see [LICENSE](LICENSE)). The repository is public for portfolio and evaluation, and team members work in it through pull requests.

## Branches

- `main` is production. Vercel deploys it on every push.
- `staging` is where work is integrated and tested.
- Cut feature branches from `staging` and open pull requests into `staging`:

  ```bash
  git checkout staging
  git pull origin staging
  git checkout -b feature/short-description
  ```

- When `staging` is verified, it is merged into `main`.

## Local setup

Follow "Local setup" in the [README](README.md). In short: Node 22, `npm install --legacy-peer-deps` at the root, then either `node scripts/dev-db.mjs` with a local Postgres or `docker compose up --build`.

Do not point a local `.env` at the production database. Use localhost, or a separate Neon branch.

## Before opening a pull request

Run the same checks CI runs:

```bash
cd backend && npx prisma validate && npx tsc --noEmit && npm test
cd frontend && npx tsc -b && npm run lint && npm run build
```

The pull request template lists the rest: screenshots for UI changes (light and dark, mobile width), a test for new behavior, and no secrets or personal data in the diff.

## Database changes

Schema changes ship as a Prisma migration under `backend/prisma/migrations/` in the same pull request. Keep them additive. Mention the migration in the description. Whoever merges to `main` must run `prisma migrate deploy` against production first; see [DEPLOYMENT.md](DEPLOYMENT.md).

## Secrets

Never commit `.env` files, tokens, database URLs or real personal data. `.env*` is git-ignored except `.env.example`. A gitleaks scan runs on every pull request.

## Reporting problems

- Bugs: open a GitHub issue with steps to reproduce and relevant logs.
- Security issues: do not open a public issue. Follow [SECURITY.md](SECURITY.md).
- Licensing or partnership questions: contact the repository owner through GitHub.
