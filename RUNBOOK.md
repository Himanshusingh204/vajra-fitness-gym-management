# VajraFitness — Backup / Restore & Disaster Recovery Runbook

**Owners:** Platform Engineering
**RPO target:** ≤ 5 minutes (daily full + WAL/PITR streaming)
**RTO target:** ≤ 60 minutes (redeploy + restore + smoke test)

---

## 1. What to back up

| Asset | Where | How |
|-------|-------|-----|
| PostgreSQL database | Neon (prod) / Render (alt) | Neon PITR + scheduled full dumps (below) |
| Source + config | GitHub | Already versioned |
| Secrets (`JWT_SECRET`, SMTP, Razorpay, `METRICS_TOKEN`, `REDIS_URL`) | Secret manager / CI env | Not in git; store in Neon/Render env vars + a password manager |
| Public assets (logo, OG image, icons, sitemap) | Repo + CDN | In git; CDN cached |

> **Redis is treated as ephemeral.** It only holds rate-limit counters and a
> 30s subscription cache — nothing durable. Losing it is a non-event; it rebuilds.

---

## 2. Database backup (production = Neon)

Neon provides **point-in-time recovery** (PITR) and **branching**; it also
supports `pg_dump`-style logical backups. Recommended schedule:

1. **Continuous PITR** — enabled by default in Neon; check the retention window
   in Dashboard → Branches → History. This covers the ≤5 min RPO.
2. **Daily logical dump** (belt & braces, kept off-site) — run on a schedule:

```bash
# One-shot dump
pg_dump "$DATABASE_URL" -Fc -f vajrafitness-$(date +%F).dump

# With a cron (daily 02:00 UTC), keep last 14:
0 2 * * * pg_dump "$DATABASE_URL" -Fc -f /backups/vajrafitness-$(date +\%F).dump \
  && find /backups -name 'vajrafitness-*.dump' -mtime +14 -delete \
  && curl -sf -X POST "https://api.vajrafitness.in/api/health" >/dev/null
```

3. **Verify the dump restores** at least weekly (a dump that never restores is
   not a backup). Script it in staging:

```bash
# Staging restore
dropdb --if-exists vajrafitness_stage_restore
createdb vajrafitness_stage_restore
pg_restore -d "$STAGE_DATABASE_URL" vajrafitness-latest.dump
psql "$STAGE_DATABASE_URL" -c "SELECT count(*) FROM \"User\";"
```

---

## 3. Restore procedures

### Point-in-time (Neon)

1. Dashboard → **Branches** → create a branch from the desired timestamp.
2. Swap `DATABASE_URL` to the branch connection string.
3. Run migrations if the branch predates them: `npx prisma migrate deploy`.
4. Smoke test (`/api/ready`, a login, a member fetch).

### Logical dump restore

```bash
createdb vajrafitness_restore
pg_restore --clean --if-exists -d "$DATABASE_URL" vajrafitness-YYYY-MM-DD.dump
npx prisma migrate deploy   # replay any newer migrations
```

> Migrations are applied only after restore — never restore over a running DB.

---

## 4. Disaster recovery runbook

### Severity: outage of a single region / provider

1. **Evaluate:** check `/api/ready`; if DB down, verify Neon status page.
2. **Decide:** fail over to the secondary branch (Neon) or the Render-managed PG.
3. **Act:**
   - Point `DATABASE_URL` at the failover branch.
   - Redeploy backend (`render.yaml` / CI) — containers run `prisma migrate deploy`.
   - Keep `REDIS_URL` pointing at the same Redis (stateless) or restart to rebuild.
4. **Verify:** `/api/ready` → 200; a member login; a gym dashboard load;
   check `/metrics` for the request counters and `vajra_db_connections`.
5. **Communicate:** status page + owner notification.

### Severity: accidental data loss (e.g., bad migration, manual delete)

1. **Stop writes** (deploy a read-only backend or block the DB user).
2. **Identify the loss time** and pick the nearest PITR point **before** it.
3. **Restore to a new branch** (never overwrite the live DB in-place).
4. **Diff** the branch against live to confirm the expected rows are back.
5. **Promote** the branch; redeploy; smoke test.
6. **Post-mortem:** why did the loss happen; add guardrails (e.g., soft-delete,
   audit log review, restricted DB access).

### Severity: corrupted / unreachable Redis

- Non-critical: rate-limit counters and a 30s cache are lost.
- The backend already falls back to in-memory state automatically.
- Restart Redis or point `REDIS_URL` at the replica; nothing to restore.

---

## 5. Security notes

- Never store dumps in the repo or a public bucket.
- Use `METRICS_TOKEN` so `/metrics` is not world-readable.
- Rotate `JWT_SECRET` only with a coordinated logout (bumps `tokenVersion`
  invalidation); dump restore of `RefreshToken` + secret rotation is fine.
- Test the restore **with the same backend version** that will run after DR.

---

## 6. Checklist (run quarterly)

- [ ] Daily logical dump job present and producing files
- [ ] A recent dump successfully restored in staging in the last 7 days
- [ ] Neon PITR retention window verified (≥ 7 days)
- [ ] `/api/ready`, `/api/health`, `/metrics` reachable
- [ ] DR runbook practiced once in the last 90 days (fire drill)
- [ ] Secrets rotation policy applied (`JWT_SECRET`, Razorpay keys, SMTP)
