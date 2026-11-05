# Validación local - 2026-11-04

## Docker

```text
docker version --format '{{.Server.Version}}'  -> 28.3.2
docker compose version                         -> v2.38.2-desktop.1
docker compose --profile app --profile tools config --quiet -> exit 0
```

Contenedores observados:

```text
securebank-frontend   Up (healthy)   127.0.0.1:8080->80/tcp
securebank-backend    Up (healthy)   127.0.0.1:3000->3000/tcp
securebank-rabbitmq   Up (healthy)   127.0.0.1:5672->5672/tcp, 127.0.0.1:15672->15672/tcp
securebank-postgres   Up (healthy)   127.0.0.1:5433->5432/tcp
securebank-redis      Up (healthy)   127.0.0.1:6379->6379/tcp
```

## HTTP

```text
GET http://127.0.0.1:8080/     -> 200
GET http://127.0.0.1:8080/api/ -> 200, Hello World!
GET http://127.0.0.1:3000/api/ -> 200, Hello World!
```

Corrección aplicada: `/api` redirigía a `http://127.0.0.1/api/` porque Nginx
usaba `$host` y redirección absoluta. Ahora la redirección es relativa y el
puerto publicado se conserva.

## API smoke

```text
PASS  GET /api - expected 200, received 200 (Hello World!)
PASS  GET /api returns a non-empty body - Hello World!
PASS  GET /api/accounts without token is rejected - expected 401, received 401
PASS  POST /api/auth/login rejects an invalid payload - expected 400, received 400
PASS  GET /api/unknown returns 404 - expected 404, received 404
All API smoke checks passed.
```

## Backend

```text
Test Suites: 4 passed, 4 total
Tests:       36 passed, 36 total
npm run lint  -> exit 0 (2 warnings: imports no usados)
npm run build -> exit 0
```

## Frontend

```text
npm run typecheck -> exit 0
npm run lint      -> exit 0
npm run build     -> exit 0
dist/index.html   0.67 kB
dist/assets/*.css 17.26 kB
dist/assets/*.js  301.90 kB
```

## Auditoría de dependencias

```text
backend:  critical=0 high=7 moderate=2 low=0 total=9
frontend: critical=0 high=0 moderate=0 low=0 total=0
```

No se ejecutó `npm audit fix` para evitar actualizaciones no revisadas.
