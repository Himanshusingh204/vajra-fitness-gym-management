import http from 'k6/http';
import { check, sleep } from 'k6';

// Load-test baseline for the Vajra Fitness backend.
// Usage:
//   k6 run load/smoke.js                 # quick smoke (10 VUs, 30s)
//   k6 run --vus 100 --duration 5m load/load.js
//
// Requires a running backend (default http://localhost:5000). Point the API to
// your environment with:  k6 run -e BASE_URL=https://api.example.com load/load.js

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

const VENDOR_EMAIL = `loadtest-${__VU}-${Date.now()}@example.com`;

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '30s', target: 60 },
    { duration: '30s', target: 60 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

// Public + auth endpoints do not require a tenant subscription, so they are the
// safest baseline to soak without fixtures. Tenant endpoints would need a valid
// gym + JWT (see the notes in load/README.md).
export default function () {
  const headers = { 'Content-Type': 'application/json' };

  const health = http.get(`${BASE_URL}/api/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const register = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      username: `user_${__VU}`,
      email: VENDOR_EMAIL,
      password: 'Loadtest123!',
      gymName: `Load Gym ${__VU}`,
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      phone: '9876543210',
    }),
    { headers },
  );
  check(register, {
    'register 2xx': (r) => r.status >= 200 && r.status < 300,
    'register 409 acceptable (exists)': (r) => r.status === 409,
  });

  const login = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: VENDOR_EMAIL, password: 'Loadtest123!' }),
    { headers },
  );
  check(login, { 'login 200': (r) => r.status === 200 });

  const gyms = http.get(`${BASE_URL}/api/gym`);
  check(gyms, { 'public gym list 200': (r) => r.status === 200 });

  sleep(1);
}
