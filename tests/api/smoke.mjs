// API smoke tests for SecureBank. Uses the Node.js global fetch so it can run
// without additional dependencies on a CI agent or on a developer machine.
//
// Usage:
//   API_BASE_URL=http://localhost:8080 node tests/api/smoke.mjs

const baseUrl = (process.env.API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
let failures = 0;

function record(name, ok, detail) {
  if (ok) {
    console.log(`PASS  ${name}${detail ? ` - ${detail}` : ''}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

async function expectStatus(name, path, expectedStatus, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    record(
      name,
      response.status === expectedStatus,
      `expected ${expectedStatus}, received ${response.status}${body ? ` (${body.slice(0, 120)})` : ''}`,
    );
    return { response, body };
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  console.log(`SecureBank API smoke target: ${baseUrl}`);

  const root = await expectStatus('GET /api', '/api', 200);
  if (root) {
    record('GET /api returns a non-empty body', root.body.trim().length > 0, root.body.slice(0, 80));
  }

  await expectStatus('GET /api/accounts without token is rejected', '/api/accounts', 401);
  await expectStatus(
    'POST /api/auth/login rejects an invalid payload',
    '/api/auth/login',
    400,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'short' }),
    },
  );
  await expectStatus('GET /api/unknown returns 404', '/api/unknown-securebank-route', 404);

  if (failures > 0) {
    console.error(`\n${failures} API smoke check(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll API smoke checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
