# VajraFitness: rules for AI work

## Definition of done

A change is not done until all of these pass:

1. **Backend**: `cd backend && npx tsc --noEmit` and the backend tests pass.
2. **Frontend**: the frontend build and lint pass.
3. **GitHub Actions**: Kavach Fitness CI/CD, E2E, and Security are green on the commit you pushed.
4. **Render**: the backend deploy is live, and `/api/health` responds.
5. **Vercel**: the deploy is live, and `/api/gym/cities` and `/api/gym?paged=1&limit=12` return 200.

If any check fails, fix the cause and rerun the checks. Report the failing step if you can't fix it.

## Branches

- Only `main` and `staging` exist on GitHub. Do not create other long-lived branches.
- Push changes to `staging` first. Fast-forward `main` to the same commit once staging is green.
- Commit and push only when the user asks for it.

## Commits

- No Claude or AI co-author trailers in commit messages.
- Keep secrets out of the repo. Never write database URLs, passwords, or tokens into files, commits, or chat output.

## Database

- Production uses Neon (project `misty-morning-17395116`, region ap-southeast-1).
- Run migrations through the deploy start command (`npx prisma migrate deploy`), not from a local machine.
- Never drop or recreate production tables. Migrations must be additive or safe for existing data.

## Deployment

- Vercel functions run in `sin1` (Singapore) to sit next to the database. Keep the `regions` setting in `vercel.json`.
- Render needs Root Directory = `backend`.
- Vercel and Render environment variables are set in their dashboards, not in the repo.
