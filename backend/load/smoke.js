import http from 'k6/http';
import { check } from 'k6';

// Quick connectivity/smoke test.
// Usage:  k6 run load/smoke.js

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = { vus: 5, duration: '10s' };

export default function () {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const ready = http.get(`${BASE_URL}/api/ready`);
  check(ready, { 'ready 200': (r) => r.status === 200 });

  const metrics = http.get(`${BASE_URL}/metrics`);
  check(metrics, { 'metrics 200/401 (token-gated)': (r) => r.status === 200 || r.status === 401 });

  const publicGyms = http.get(`${BASE_URL}/api/gym`);
  check(publicGyms, { 'public gym list 200': (r) => r.status === 200 });
}
