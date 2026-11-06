/** 
 * Integración real API -> Redis: cinco credenciales erróneas, bloqueo y TTL.
 * No toca cuentas reales: usa una identidad sintética aleatoria que no existe.
 * Requiere `npm ci` en raíz del repositorio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
const base = (process.env.QA_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const redis = new Redis(process.env.QA_REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: true, maxRetriesPerRequest: 1,
});
await test('INT-REDIS-01 — bloqueo y TTL de intentos fallidos', async () => {
  const email = `qa-rate-${randomUUID()}@example.invalid`;
  const attemptsKey = `auth:failed:${email}`;
  const lockKey = `auth:locked:${email}`;
  try {
    await redis.connect();
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'SiempreIncorrecta123!' }),
        signal: AbortSignal.timeout(10000),
      });
      assert.equal(response.status, 401, `Intento ${i+1}: esperaba 401 y hubo ${response.status}`);
    }
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'SiempreIncorrecta123!' }),
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 403, 'El sexto intento debe estar bloqueado');
    const ttl = await redis.ttl(lockKey);
    assert.ok(ttl > 0 && ttl <= 900, `TTL de bloqueo fuera del rango: ${ttl}`);
    assert.equal(await redis.get(attemptsKey), null, 'Contador de intentos debió invalidarse');
  } finally {
    if (redis.status === 'ready') await redis.del(attemptsKey, lockKey);
    redis.disconnect();
  }
});
