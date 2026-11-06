/**
 * SecureBank — pruebas API reales con Node.js 20+.
 * SOLO contra una BD aislada de QA y dos usuarios de prueba con cuentas financiadas.
 * Se ejecutan en serie para mantener la trazabilidad de saldos.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = (process.env.QA_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const required = ['QA_EMAIL', 'QA_PASSWORD', 'QA_OTHER_EMAIL', 'QA_OTHER_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta ${key}; configura credenciales sintéticas de QA fuera del repositorio`);
}
const writeTests = process.env.QA_WRITE_TESTS === '1';
if (writeTests) {
  assert.equal(process.env.QA_DB_ISOLATED, 'YES', 'Se requiere QA_DB_ISOLATED=YES para permitir escrituras');
  const target = new URL(base);
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname) || process.env.QA_ALLOW_REMOTE_QA === 'YES',
    'Escrituras permitidas solo en localhost, salvo QA_ALLOW_REMOTE_QA=YES para QA remoto autorizado');
}

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload };
}
function moneyCents(amount) {
  const s = String(amount);
  assert.match(s, /^\d+(?:\.\d{1,2})?$/, `Importe no monetario: ${s}`);
  const [intPart, fracPart = ''] = s.split('.');
  return BigInt(intPart) * 100n + BigInt(fracPart.padEnd(2, '0'));
}
function findAccount(list, id) { return list.find(a => a.id === id); }

await test('SecureBank QA — API, autorización e integridad bancaria', async t => {
  async function login(email, password) {
    const res = await request('POST', '/api/auth/login', { body: { email, password } });
    assert.equal(res.status, 200, `Login QA: HTTP ${res.status}. Revisar backend, Redis y credenciales`);
    assert.ok(res.payload?.access_token, 'JWT ausente');
    return res.payload.access_token;
  }

  const tokenA = await login(process.env.QA_EMAIL, process.env.QA_PASSWORD);
  const tokenB = await login(process.env.QA_OTHER_EMAIL, process.env.QA_OTHER_PASSWORD);
  const accountsA = await request('GET', '/api/accounts', { token: tokenA });
  const accountsB = await request('GET', '/api/accounts', { token: tokenB });
  assert.equal(accountsA.status, 200);
  assert.equal(accountsB.status, 200);
  assert.ok(Array.isArray(accountsA.payload) && accountsA.payload.length, 'El usuario A necesita cuenta de QA');
  assert.ok(Array.isArray(accountsB.payload) && accountsB.payload.length, 'El usuario B necesita cuenta de QA');
  const source = accountsA.payload.find(a => a.status === 'ACTIVE');
  const target = accountsB.payload.find(a => a.status === 'ACTIVE' && a.currency === source?.currency);
  assert.ok(source && target, 'Se requieren dos cuentas activas y misma moneda para pruebas bancarias');

  await t.test('API-01: login exitoso y cuentas del titular', () => {
    assert.ok(tokenA.length > 20);
    assert.ok(accountsA.payload.every(a => a.id && a.balance !== undefined));
  });
  await t.test('SEC-01: acceso sin token denegado', async () => {
    assert.equal((await request('GET', '/api/accounts')).status, 401);
  });
  await t.test('SEC-02: login erróneo denegado', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { email: `qa-${Date.now()}@example.invalid`, password: 'Incorrecta123!' },
    });
    assert.equal(res.status, 401);
  });
  await t.test('API-02: consulta de movimientos de cuenta propia', async () => {
    const res = await request('GET', `/api/accounts/${source.id}/transactions`, { token: tokenA });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.payload));
  });
  await t.test('SEC-03: IDOR, usuario A no consulta movimientos de B', async () => {
    const res = await request('GET', `/api/accounts/${target.id}/transactions`, { token: tokenA });
    assert.ok([403,404].includes(res.status), `IDOR potencial: status ${res.status}`);
  });
  await t.test('API-03: monto de transferencia negativo rechazado', async () => {
    const res = await request('POST', '/api/transfers', { token: tokenA, body: {
      sourceAccountId: source.id, destinationAccountId: target.id,
      amount: -1, idempotencyKey: randomUUID(),
    }});
    assert.equal(res.status, 400);
  });
  await t.test('API-04: pago con monto negativo rechazado', async () => {
    const res = await request('POST', '/api/payments', { token: tokenA, body: {
      accountId: source.id, amount: -1, idempotencyKey: randomUUID(),
      serviceName: 'Servicio de QA', serviceReference: 'QA-NEGATIVO',
    }});
    assert.equal(res.status, 400);
  });
  await t.test('SEC-04: transferencia desde cuenta ajena prohibida', async () => {
    const res = await request('POST', '/api/transfers', { token: tokenA, body: {
      sourceAccountId: target.id, destinationAccountId: source.id,
      amount: 0.01, idempotencyKey: randomUUID(),
    }});
    assert.equal(res.status, 403);
  });

  const write = (name, fn) =>
    t.test(name, { skip: !writeTests }, fn);
  async function balances() {
    const [a, b] = await Promise.all([
      request('GET', '/api/accounts', { token: tokenA }),
      request('GET', '/api/accounts', { token: tokenB }),
    ]);
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    return { a: moneyCents(findAccount(a.payload, source.id).balance),
      b: moneyCents(findAccount(b.payload, target.id).balance) };
  }
  await write('BANK-01: clave repetida no produce doble descuento', async () => {
    const before = await balances();
    assert.ok(before.a >= 2n, 'Saldo de QA insuficiente');
    const data = { sourceAccountId: source.id, destinationAccountId: target.id,
      amount: 0.01, idempotencyKey: randomUUID(), description: 'QA idempotencia' };
    const first = await request('POST', '/api/transfers', { token: tokenA, body: data });
    assert.equal(first.status, 201, `Primera transferencia: ${first.status}`);
    const afterFirst = await balances();
    const duplicate = await request('POST', '/api/transfers', { token: tokenA, body: data });
    assert.equal(duplicate.status, 409, 'Esta implementación espera 409 para clave ya utilizada');
    const afterDuplicate = await balances();
    assert.deepEqual(afterFirst, afterDuplicate, 'Se modificó saldo tras la solicitud duplicada');
    assert.equal(afterFirst.a, before.a - 1n);
    assert.equal(afterFirst.b, before.b + 1n);
  });
  await write('BANK-02: doble envío simultáneo, un solo débito', async () => {
    const before = await balances();
    assert.ok(before.a >= 2n, 'Saldo de QA insuficiente');
    const data = { sourceAccountId: source.id, destinationAccountId: target.id,
      amount: 0.01, idempotencyKey: randomUUID(), description: 'QA concurrencia' };
    const count = Number(process.env.QA_CONCURRENCY || 8);
    assert.ok(Number.isInteger(count) && count >= 2 && count <= 30);
    const responses = await Promise.all(Array.from({ length: count }, () =>
      request('POST', '/api/transfers', { token: tokenA, body: data })));
    const statuses = responses.map(r => r.status);
    assert.equal(statuses.filter(x => x === 201).length, 1, `Esperaba exactamente una creación; HTTP: ${statuses}`);
    assert.ok(statuses.every(x => [201,409].includes(x)), `Fallos inesperados bajo concurrencia: ${statuses}`);
    const after = await balances();
    assert.equal(after.a, before.a - 1n, 'Débito duplicado');
    assert.equal(after.b, before.b + 1n, 'Crédito duplicado');
  });
});
