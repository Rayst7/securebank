# SecureBank — Frontend web

Aplicación web de banca digital de SecureBank. Consume la API REST del backend
NestJS (`/api`) e implementa los flujos de autenticación, cuentas, movimientos,
beneficiarios, transferencias, pagos e historial.

## Stack

| Componente | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| UI | React 19 |
| Build | Vite 8 |
| Rutas | React Router 7 |
| Estilos | CSS propio (variables + clases utilitarias) |
| HTTP | `fetch` con cliente central |
| Pruebas E2E | Cypress (preparado con `data-testid`) |

## Requisitos

- Node.js 20 o superior (probado con Node 24).
- npm 10 o superior.
- Backend de SecureBank en ejecución en `http://localhost:3000`.
- PostgreSQL, Redis y RabbitMQ levantados (el backend no arranca sin RabbitMQ).

## Instalación

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

La aplicación queda en `http://localhost:5173`.

### Variables de entorno

| Variable | Valor por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `/api` | URL base del cliente HTTP |
| `VITE_PROXY_TARGET` | `http://localhost:3000` | Destino del proxy de Vite |

En desarrollo se usa el proxy de Vite (`/api` → `http://localhost:3000`), por lo
que **no se necesita CORS** mientras el backend no lo habilite. Si prefieres
llamar la API directamente, define `VITE_API_URL=http://localhost:3000/api` y
pide a Persona 1 que habilite CORS para `http://localhost:5173`.

## Credenciales de prueba

Creadas por los scripts de `backend/scripts/`:

| Usuario | Contraseña | Cuenta |
|---|---|---|
| `cliente@securebank.test` | `ClienteDemo2026!` | `SB-10000001` (Q1,000.00) |
| `destino.transfer.test@securebank.test` | `DestinoDemo2026!` | `SB-10000002` (Q500.00) |

> Solo para el entorno local de desarrollo. No usar en producción.

## Pantallas implementadas

| Ruta | Pantalla | Endpoints |
|---|---|---|
| `/login` | Inicio de sesión | `POST /auth/login` |
| `/dashboard` | Resumen, saldo y cuentas | `GET /accounts` |
| `/movimientos` | Movimientos por cuenta | `GET /accounts/:id/transactions` |
| `/transferencias` | Formulario de transferencia | `GET /accounts`, `POST /transfers` |
| `/beneficiarios` | Alta y lista de beneficiarios | `GET/POST /beneficiaries` |
| `/pagos` | Pago de servicios | `GET /accounts`, `GET/POST /payments` |
| `/historial` | Historial unificado | `GET /transfers`, `GET /payments` |

Estados cubiertos: carga, error con reintento, lista vacía, validación de
formularios, éxito con confirmación y sesión expirada (401 → login).

## Estructura

```
frontend/
├── public/
├── src/
│   ├── components/    # Botones, inputs, cards, badges, estados
│   ├── contexts/      # Autenticación y notificaciones
│   ├── hooks/         # useAuth, useToast, useApiQuery
│   ├── layouts/       # AppLayout (privado) y AuthLayout (público)
│   ├── pages/         # Una página por flujo
│   ├── routes/        # Router y rutas protegidas
│   ├── services/      # Cliente HTTP y servicios por módulo
│   ├── styles/        # Hoja de estilos global
│   ├── types/         # Tipos del contrato de la API
│   └── utils/         # Formato, validación e idempotencia
├── .env.example
├── index.html
├── package.json
└── vite.config.ts
```

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Verificación de tipos + build de producción |
| `npm run typecheck` | Solo verificación de TypeScript |
| `npm run lint` | Oxlint |
| `npm run preview` | Sirve el build de producción |

## Contrato de la API y decisiones de UI

- **Dinero:** el backend devuelve strings (`"1000.00"`). Se formatean con
  `Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' })`.
- **Autenticación:** JWT de 1 hora, sin refresh. El token y el usuario se
  guardan en `localStorage`; ante un 401 se limpia la sesión y se redirige al
  login. En producción se recomienda evaluar `sessionStorage` o cookies
  `HttpOnly`.
- **Idempotencia:** cada formulario genera una clave con `crypto.randomUUID()`.
  Se reutiliza la misma clave al reintentar tras un error de red. Un `409`
  significa que la operación ya fue registrada o hubo conflicto: se conserva la
  clave y se invita a revisar el historial antes de reintentar.
- **Cuenta destino:** `POST /transfers` exige `destinationAccountId` (UUID). La
  UI permite elegir una cuenta propia o pegar el UUID de otra cuenta. La
  búsqueda por número de cuenta o por beneficiario está pendiente en el backend.
- **Pagos:** `POST /payments` exige `idempotencyKey` y `amount` como número JSON.
- **Validación:** el backend usa `forbidNonWhitelisted`; cualquier campo extra
  devuelve 400. Los formularios envían solo los campos del contrato.

## Limitaciones conocidas del backend

1. No hay endpoint para resolver `accountNumber` → `accountId`.
2. No existe `GET /api/me` ni refresh token; el usuario se reconstruye desde
   `localStorage`.
3. Los listados no tienen paginación; el historial se filtra en el cliente.
4. El bloqueo de login (5 intentos / 15 minutos) responde `403`, no `429`.
5. CORS no está habilitado; en desarrollo se usa el proxy de Vite.

## Pruebas y evidencias

Los elementos interactivos incluyen `data-testid` para Cypress:

- `login-email`, `login-password`, `login-submit`
- `transfer-source`, `transfer-destination`, `transfer-amount`, `transfer-submit`
- `beneficiary-alias`, `beneficiary-account`, `beneficiary-bank`, `beneficiary-submit`
- `payment-account`, `payment-service`, `payment-reference`, `payment-amount`, `payment-submit`

Los flujos de Cypress se ubicarán en `tests/cypress/` y las evidencias en
`reports/frontend/`, según el plan del equipo.

## Flujo de ramas

- Rama de trabajo: `feature/frontend` (desde `develop`).
- Pull Request hacia `develop`.
- Commits con Conventional Commits: `feat(frontend): ...`, `fix(frontend): ...`,
  `test(frontend): ...`.
- No se commitean `.env`, `node_modules` ni `dist`.
