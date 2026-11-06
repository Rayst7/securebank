// k6 performance smoke for SecureBank.
//
// Run locally:
//   docker run --rm -v "$PWD/tests/performance:/scripts:ro" \
//     -e BASE_URL=http://localhost:8080 grafana/k6 run /scripts/smoke.js
//
// Thresholds are intentionally conservative for a single QA VM. Adjust only
// with measured evidence from the target environment.
import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '')

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
}

export default function () {
  const home = http.get(`${baseUrl}/`)
  check(home, { 'frontend returns 200': (response) => response.status === 200 })

  const api = http.get(`${baseUrl}/api/`)
  check(api, { 'API proxy returns 200': (response) => response.status === 200 })

  sleep(1)
}
