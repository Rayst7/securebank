# SecureBank — Frontend web

Aplicación web de banca digital de SecureBank. Es una SPA (Single Page
Application) hecha con **React + Vite + TypeScript** que consume la API REST del
backend NestJS bajo el prefijo `/api`.

Permite a un cliente:

- Iniciar y cerrar sesión con JWT.
- Ver su saldo total y sus cuentas.
- Consultar los movimientos de cada cuenta.
- Transferir dinero entre cuentas propias o a otra cuenta (por UUID).
- Registrar y consultar beneficiarios.
- Pagar servicios.
- Revisar el historial unificado de transferencias y pagos.

---

## Tabla de contenido

1. [Stack](#stack)
2. [Requisitos](#requisitos)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Variables de entorno](#variables-de-entorno)
5. [Comandos](#comandos)
6. [Credenciales de prueba](#credenciales-de-prueba)
7. [Pantallas y rutas](#pantallas-y-rutas)
8. [Arquitectura](#arquitectura)
9. [Autenticación y seguridad](#autenticación-y-seguridad)
10. [Reglas de negocio en la UI](#reglas-de-negocio-en-la-ui)
11. [Pruebas y evidencias](#pruebas-y-evidencias)
12. [Limitaciones conocidas](#limitaciones-conocidas)
13. [Solución de problemas](#solución-de-problemas)
14. [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)

---

## Stack

| Componente | Tecnología | Versión |
|---|---|---|
| Lenguaje | TypeScript (modo estricto) | 6.0 |
| UI | React | 19 |
| Build y servidor de desarrollo | Vite + `@vitejs/plugin-react` | 8 |
| Rutas | React Router (`react-router-dom`) | 7 |
| Estilos | CSS propio con variables (`src/styles/global.css`) | — |
| HTTP | `fetch` nativo con un cliente central | — |
| Linter | Oxlint | 1.x |
| Pruebas E2E | Cypress (la UI ya expone `data-testid`) | — |

No usa librerías de componentes, de estado global ni de peticiones: el estado se
maneja con Context de React y un hook propio (`useApiQuery`).

## Requisitos

- **Node.js 20** o superior (probado con Node 24) y **npm 10** o superior.
- **Backend de SecureBank** corriendo en `http://localhost:3000`.
- **PostgreSQL, Redis y RabbitMQ** levantados con Docker. El backend no arranca
  sin RabbitMQ.

## Puesta en marcha

### 1. Levantar la infraestructura y el backend

Desde la raíz del repositorio:

```bash
cp .env.example .env            # ajusta contraseñas y JWT_SECRET
docker compose up -d            # PostgreSQL (5433), Redis (6379), RabbitMQ (5672)

cd backend
npm install
npx prisma migrate deploy       # crea las tablas
npm run start:dev               # API en http://localhost:3000/api
```

Para crear usuarios y cuentas de prueba, usa los scripts de `backend/scripts/`
(ver la documentación del backend).

### 2. Levantar el frontend

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

La aplicación queda disponible en **http://localhost:5173**.

## Variables de entorno

Archivo `frontend/.env` (basado en `.env.example`):

| Variable | Valor por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `/api` | URL base que usa el cliente HTTP. |
| `VITE_PROXY_TARGET` | `http://localhost:3000` | Hacia dónde redirige el proxy de Vite las llamadas a `/api`. |

**¿Por qué un proxy?** El backend no tiene CORS habilitado. En desarrollo, Vite
recibe las peticiones a `/api` y las reenvía a `http://localhost:3000`, así el
navegador cree que todo viene del mismo origen. El proxy funciona en
`npm run dev` (puerto 5173) y en `npm run preview` (puerto 4173).

Si prefieres llamar la API directamente, usa
`VITE_API_URL=http://localhost:3000/api`; en ese caso el backend debe habilitar
CORS para `http://localhost:5173`.

> Las variables `VITE_*` se incrustan en el bundle al compilar. No pongas
> secretos en ellas.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente (HMR). |
| `npm run build` | Verifica tipos (`tsc -b`) y genera el build de producción en `dist/`. |
| `npm run typecheck` | Solo verifica tipos de TypeScript. |
| `npm run lint` | Analiza el código con Oxlint. |
| `npm run preview` | Sirve el build de `dist/` en `http://localhost:4173`. |

## Credenciales de prueba

Creadas con los scripts de `backend/scripts/`:

| Usuario | Contraseña | Cuenta |
|---|---|---|
| `cliente@securebank.test` | `ClienteDemo2026!` | `SB-10000001` (Q1,000.00) |
| `destino.transfer.test@securebank.test` | `DestinoDemo2026!` | `SB-10000002` (Q500.00) |

> Solo para desarrollo local. No usar en ningún otro entorno.

## Pantallas y rutas

| Ruta | Pantalla | Qué hace | Endpoints |
|---|---|---|---|
| `/login` | Inicio de sesión | Formulario de correo y contraseña. | `POST /auth/login` |
| `/` | — | Redirige a `/dashboard`. | — |
| `/dashboard` | Resumen | Saldo total, lista de cuentas y estado. | `GET /accounts` |
| `/movimientos` | Movimientos | Cargos y abonos de la cuenta seleccionada. | `GET /accounts/:id/transactions` |
| `/transferencias` | Transferencias | Transferencia a cuenta propia o externa (UUID). | `GET /accounts`, `POST /transfers` |
| `/beneficiarios` | Beneficiarios | Alta y lista de contactos. | `GET /beneficiaries`, `POST /beneficiaries` |
| `/pagos` | Pagos | Pago de servicios con cuenta de cargo y referencia. | `GET /accounts`, `GET /payments`, `POST /payments` |
| `/historial` | Historial | Transferencias y pagos juntos, con filtros. | `GET /transfers`, `GET /payments` |
| `*` | 404 | Página no encontrada. | — |

Todas las rutas excepto `/login` y la 404 están protegidas por
`ProtectedRoute`: sin sesión, el usuario vuelve al login.

Cada pantalla cubre estos estados: **carga**, **error con botón de reintento**,
**lista vacía**, **errores de validación**, **éxito con confirmación** y
**sesión expirada** (401 → login).

## Arquitectura

```
frontend/
├── public/                 # Archivos estáticos (favicon)
├── src/
│   ├── main.tsx            # Punto de entrada: monta <App /> y los estilos
│   ├── App.tsx             # ToastProvider → AuthProvider → AppRouter
│   ├── routes/router.tsx   # Definición de rutas públicas y privadas
│   ├── layouts/
│   │   ├── AppLayout.tsx   # Menú lateral y contenido de las rutas privadas
│   │   └── AuthLayout.tsx  # Marco de las pantallas públicas (login)
│   ├── pages/              # Una página por flujo (Dashboard, Transfer, ...)
│   ├── components/         # UI reutilizable: Button, Input, Select, Card,
│   │                       # Badge, Alert, StatCard, DataState, EmptyState,
│   │                       # Spinner, PageHeader, Icon, ProtectedRoute
│   ├── contexts/           # AuthProvider (sesión) y ToastProvider (avisos)
│   ├── hooks/              # useAuth, useToast, useApiQuery
│   ├── services/           # api.ts (cliente HTTP) + un servicio por módulo
│   ├── types/              # Tipos del contrato de la API
│   ├── utils/              # format, validation, labels, idempotency
│   └── styles/global.css   # Variables de diseño y estilos globales
├── .env.example
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts          # Puerto 5173 y proxy /api
```

### Flujo de una petición

```
Página ──► servicio (p. ej. transfers.service.ts)
              │
              ▼
         apiRequest()  (services/api.ts)
           • agrega Authorization: Bearer <token>
           • corta la petición a los 15 s
           • convierte errores del backend en ApiError(status, mensaje, detalles)
           • si responde 401 → borra la sesión y emite "securebank:unauthorized"
              │
              ▼
         Vite proxy /api ──► http://localhost:3000/api (NestJS)
```

- **`useApiQuery`** envuelve las consultas GET y devuelve
  `{ data, loading, error, reload }` para pintar los estados de la pantalla.
- **`AuthProvider`** escucha el evento `securebank:unauthorized` y cierra la
  sesión, con lo que `ProtectedRoute` manda al usuario al login.
- **`ToastProvider`** muestra avisos breves de éxito o error.

## Autenticación y seguridad

- El login devuelve un **JWT válido por 1 hora**. No hay refresh token.
- El token (`securebank.token`) y los datos del usuario (`securebank.user`) se
  guardan en `localStorage`. Al recargar la página, la sesión se reconstruye
  desde ahí.
- Ante cualquier **401**, se borra la sesión y se vuelve al login.
- No se guardan contraseñas en el navegador.
- Los formularios envían **solo** los campos del contrato, porque el backend usa
  `ValidationPipe` con `forbidNonWhitelisted`: un campo extra devuelve 400.

> Para producción conviene evaluar cookies `HttpOnly` o `sessionStorage` en
> lugar de `localStorage`, y servir todo por HTTPS.

## Reglas de negocio en la UI

### Montos

- El backend devuelve el dinero como texto (`"1000.00"`). Se muestra con
  `Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' })`.
- `parseAmount` (`utils/validation.ts`) acepta entre **0.01 y 1,000,000.00**, con
  máximo **dos decimales**. Acepta coma o punto como separador decimal.

### Transferencias

1. La cuenta de origen debe ser del usuario y estar `ACTIVE`.
2. La cuenta destino debe existir, estar `ACTIVE` y usar la misma moneda.
3. Origen y destino deben ser diferentes.
4. El saldo debe cubrir el monto.
5. El destino se envía como `destinationAccountId` (**UUID**). La UI permite
   elegir una cuenta propia o pegar el UUID de otra cuenta.

### Pagos

- `POST /payments` exige `idempotencyKey` y `amount` como **número** JSON.

### Idempotencia (evitar cobros duplicados)

- Cada formulario genera una clave con `crypto.randomUUID()`
  (`utils/idempotency.ts`).
- Si la petición falla por red o timeout, el reintento **usa la misma clave**,
  así el backend no registra la operación dos veces.
- Un **409** significa que la operación ya se registró o hubo conflicto: se
  conserva la clave y se pide revisar el historial antes de reintentar.
- Solo se genera una clave nueva después de una operación exitosa.

## Pruebas y evidencias

### Selectores para Cypress

Los elementos interactivos tienen `data-testid`:

| Flujo | `data-testid` |
|---|---|
| Login | `login-email`, `login-password`, `login-submit` |
| Transferencia | `transfer-source`, `transfer-destination`, `transfer-amount`, `transfer-description`, `transfer-submit` |
| Beneficiarios | `beneficiary-alias`, `beneficiary-account`, `beneficiary-bank`, `beneficiary-submit` |
| Pagos | `payment-account`, `payment-service`, `payment-reference`, `payment-amount`, `payment-submit` |

Ejemplo:

```js
cy.visit('/login')
cy.get('[data-testid=login-email]').type('cliente@securebank.test')
cy.get('[data-testid=login-password]').type('ClienteDemo2026!')
cy.get('[data-testid=login-submit]').click()
cy.url().should('include', '/dashboard')
```

### Dónde va cada cosa

| Qué | Carpeta |
|---|---|
| Pruebas E2E con Cypress | `tests/cypress/` |
| Capturas y reportes del frontend | `reports/frontend/` |

### Verificación antes de un PR

```bash
npm run typecheck
npm run lint
npm run build
```

## Limitaciones conocidas

1. No hay endpoint para buscar una cuenta por número (`accountNumber` →
   `accountId`). Transferir a otra persona requiere el UUID de su cuenta.
2. Los beneficiarios son solo una agenda: `POST /transfers` no acepta
   `beneficiaryId`.
3. No existe `GET /api/me` ni refresh token; el usuario se reconstruye desde
   `localStorage` y la sesión dura 1 hora.
4. Los listados no tienen paginación; el historial se filtra en el navegador.
5. El bloqueo de login (5 intentos fallidos en 15 minutos) responde `403`, no
   `429`.
6. CORS no está habilitado en el backend; en desarrollo se depende del proxy de
   Vite.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "No se pudo conectar con el servidor" | El backend no está corriendo o `VITE_PROXY_TARGET` es incorrecto. | Verifica `http://localhost:3000/api` y reinicia `npm run dev` tras cambiar `.env`. |
| El backend no arranca | RabbitMQ, Redis o PostgreSQL apagados. | `docker compose ps` y `docker compose up -d`. |
| Error de CORS en la consola | `VITE_API_URL` apunta directo a `http://localhost:3000`. | Vuelve a `VITE_API_URL=/api` para usar el proxy. |
| Me saca al login de repente | El JWT expiró (1 hora) y la API respondió 401. | Inicia sesión otra vez. |
| 400 al enviar un formulario | Campo inválido o campo extra no permitido. | Revisa el mensaje; el detalle viene en `ApiError.details`. |
| 403 al iniciar sesión | Cuenta bloqueada por 5 intentos fallidos. | Espera 15 minutos. |
| 409 en transferencia o pago | La clave de idempotencia ya se usó. | Revisa el historial antes de reintentar. |

## Flujo de trabajo con Git

- Rama de trabajo: `feature/frontend`, creada desde `develop`.
- Los cambios entran a `develop` mediante Pull Request; `main` está protegida.
- Commits con Conventional Commits:
  `feat(frontend): ...`, `fix(frontend): ...`, `test(frontend): ...`.
- No se suben `.env`, `node_modules/` ni `dist/`.
