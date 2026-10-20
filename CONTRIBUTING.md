# Contributing

VajraFitness is a commercial product (see [`LICENSE`](./LICENSE)). This
repository is public for portfolio, evaluation, and team collaboration purposes.

## Development & Branching Workflow

To prevent breaking live production deployments on Vercel:

- **`main`**: Protected production branch. Deploys live automatically to Vercel upon merge.
- **`staging`**: Primary collaboration and integration branch.
- **Feature Branches**: Contributors and team members should branch off `staging`:
  ```bash
  git checkout staging
  git pull origin staging
  git checkout -b feature/your-feature-name
  ```
- **Pull Requests**: Open Pull Requests targeting the `staging` branch. Once reviewed and validated through CI, `staging` is merged into `main`.

## Local Environment & Secret Protection

- **Never commit `.env` or credential files.** Use `.env.example` as a template for your local `.env.local` or `backend/.env`.
- Test against a local PostgreSQL database or an isolated personal development instance on Neon.

## Found a bug or security issue?

- **Security vulnerabilities**: see [`SECURITY.md`](./SECURITY.md) — please report privately.
- **Bug reports**: open a GitHub Issue with reproduction steps and logs.

## Licensing or partnership inquiries

Contact <legal@vajrafitness.in>.
