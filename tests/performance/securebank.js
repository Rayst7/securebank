/**
 * k6: carga/estrés/pico SOLO lecturas en /api/accounts (sin movimientos de dinero).
 * Definir y aprobar umbrales ANTES de ejecutar. Los valores son una propuesta.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const mode = __ENV.QA_MODE || 'load';
const base = (__ENV.QA_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const schedules = {
  load: [{ duration: '30s', target: 5 }, { duration: '1m', target: 10 }, { duration: '30s', target: 0 }],
  stress: [{ duration: '30s', target: 10 }, { duration: '1m', target: 25 }, { duration: '30s', target: 0 }],
  spike: [{ duration: '20s', target: 5 }, { duration: '10s', target: 60 },
    { duration: '20s', target: 60 }, { duration: '20s', target: 0 }],
};
if (!schedules[mode]) throw new Error('QA_MODE inválido: load, stress o spike');
export const options = {
  stages: schedules[mode],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!__ENV.QA_EMAIL || !__ENV.QA_PASSWORD) throw new Error('Faltan QA_EMAIL y QA_PASSWORD');
  const response = http.post(`${base}/api/auth/login`, JSON.stringify({
    email: __ENV.QA_EMAIL, password: __ENV.QA_PASSWORD,
  }), { headers: { 'content-type': 'application/json' } });
  if (response.status !== 200 || !response.json('access_token')) {
    throw new Error(`No se pudo iniciar sesión con cuenta QA: ${response.status}`);
  }
  return { token: response.json('access_token') };
}
export default function (ctx) {
  const response = http.get(`${base}/api/accounts`, {
    headers: { authorization: `Bearer ${ctx.token}` },
    tags: { endpoint: 'accounts_read' },
  });
  check(response, {
    'HTTP 200': r => r.status === 200,
    'JSON de cuentas': r => { try { return Array.isArray(r.json()); } catch { return false; } },
  });
  sleep(0.2);
}
