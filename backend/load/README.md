# Load testing (k6)

Baseline load tests for the VajraFitness backend using [Grafana k6](https://k6.io).

## Install k6

- Windows (choco): `choco install k6`
- macOS (brew): `brew install k6`
- Linux: `sudo apt install k6` or the binary from https://grafana.com/oss/k6/

## Run

```bash
# Smoke test (connectivity + happy paths)
k6 run load/smoke.js

# Ramped load baseline (20 -> 60 VUs over 2 minutes)
k6 run load/load.js

# Against a deployed environment
k6 run -e BASE_URL=https://api.vajrafitness.in load/load.js

# Bigger soak
k6 run --vus 100 --duration 5m -e BASE_URL=https://api.vajrafitness.in load/load.js
```

## What is exercised

- `GET /api/health`, `GET /api/ready` — liveness/readiness probes.
- `GET /metrics` — Prometheus endpoint (expect 200, or 401 when `METRICS_TOKEN` is set).
- `POST /api/auth/register` — vendor registration (creates a gym per VU).
- `POST /api/auth/login` — login (exercises argon2 + refresh-token issuance).
- `GET /api/gym` — public gym listing (read path through subscription middleware).

## Thresholds (load.js)

- Failure rate < 1%
- p95 latency < 500ms

Tune these to the SLO of your environment. Public/auth endpoints are used on
purpose — they need no fixtures. To load-test tenant endpoints (members, fees,
classes) you need a valid gym + JWT: seed a gym with `npm run seed`, log in,
capture the bearer token, and add authed requests to a fork of `load.js`.

## Notes

- Every VU registers a unique vendor, so the DB grows during a run — use a
  disposable staging DB for meaningful soak runs.
- The backend rate-limiter caps auth at 30 req/15 min per IP behind one proxy
  IP. When load testing auth endpoints, raise `max` in
  `src/middlewares/rateLimit.middleware.ts` (or run VUs across distinct IPs).
- Watch `vajra_http_request_duration_seconds` and
  `vajra_background_jobs_total` on the /metrics endpoint during the run.
