/**
 * k6: escrituras de transferencias en QA. NUNCA ejecutar en producción.
 * Estado bancario persiste entre corridas; verificar presupuesto y saldos.
 * QA_PERF_WRITE=YES QA_DB_ISOLATED=YES QA_DEST_ACCOUNT_ID=<UUID>
 * Importes mínimos (0.01) con idempotencyKey única por iteración.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
const mode = __ENV.QA_MODE || 'load';
const base = (__ENV.QA_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const schedules = {
  load: [{ duration: '20s', target: 2 }, { duration: '30s', target: 3 }, { duration: '10s', target: 0 }],
  stress: [{ duration: '20s', target: 3 }, { duration: '30s', target: 10 }, { duration: '10s', target: 0 }],
  spike: [{ duration: '10s', target: 2 }, { duration: '10s', target: 20 },
    { duration: '15s', target: 20 }, { duration: '10s', target: 0 }],
};
if (!schedules[mode]) throw new Error('QA_MODE inválido');
export const options = {
  stages: schedules[mode],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};
function accounts(token) {
  const res = http.get(`${base}/api/accounts`, {headers:{authorization:`Bearer ${token}`}});
  if (res.status !== 200) throw new Error(`HTTP ${res.status} consultando cuentas`);
  return res.json();
}
export function setup() {
  if (__ENV.QA_PERF_WRITE !== 'YES' || __ENV.QA_DB_ISOLATED !== 'YES') {
    throw new Error('Solo ejecutar con QA_PERF_WRITE=YES y QA_DB_ISOLATED=YES');
  }
  if (!__ENV.QA_EMAIL || !__ENV.QA_PASSWORD || !__ENV.QA_DEST_ACCOUNT_ID || !__ENV.QA_RUN_ID) {
    throw new Error('Falta QA_EMAIL, QA_PASSWORD, QA_DEST_ACCOUNT_ID o QA_RUN_ID');
  }
  const host = base.replace(/^https?:\/\//,'').split(':')[0];
  if (!['localhost','127.0.0.1'].includes(host) && __ENV.QA_ALLOW_REMOTE_QA !== 'YES') {
    throw new Error('Transferencias de rendimiento solo en localhost u otro QA remoto autorizado');
  }
  const login = http.post(`${base}/api/auth/login`, JSON.stringify({email:__ENV.QA_EMAIL,password:__ENV.QA_PASSWORD}), {
    headers: {'content-type':'application/json'},
  });
  if (login.status !== 200) throw new Error('Falló login QA');
  const token = login.json('access_token');
  const source = accounts(token).find(a => a.status === 'ACTIVE');
  if (!source) throw new Error('Sin cuenta activa de QA');
  if (Number(source.balance) < 10) throw new Error('Saldo insuficiente para ejecutar escritura de carga');
  return {token, sourceId:source.id, destinationId:__ENV.QA_DEST_ACCOUNT_ID, initialBalance:source.balance};
}
export default function (ctx) {
  const key = `qa-perf-${__ENV.QA_RUN_ID}-${__VU}-${__ITER}`;
  const body = JSON.stringify({
    sourceAccountId:ctx.sourceId, destinationAccountId:ctx.destinationId,
    amount:0.01, idempotencyKey:key, description:'QA perf synthetic',
  });
  const response = http.post(`${base}/api/transfers`,body,{
    headers:{authorization:`Bearer ${ctx.token}`,'content-type':'application/json'},
    tags:{endpoint:'transfers_write'},
  });
  check(response,{'201 creación de transferencia':r=>r.status===201});
  sleep(0.4);
}
export function teardown(ctx) {
  const current = accounts(ctx.token).find(a=>a.id===ctx.sourceId);
  console.log(`Cuenta sintética QA origen: saldo inicial=${ctx.initialBalance}, saldo final=${current?.balance}. Corroborar en PostgreSQL transferencias, movimientos y auditoría.`);
}
