# SecureBank — App móvil

Aplicación móvil de banca digital de SecureBank, hecha con **React Native +
Expo + TypeScript**. Funciona en Android e iOS (con Expo Go o emulador) y
consume la misma API REST que el frontend web (`/api` del backend NestJS).

Permite a un cliente:

- Iniciar y cerrar sesión; la sesión se restaura al abrir la app.
- Ver su saldo total, sus cuentas y accesos rápidos.
- Consultar movimientos por cuenta, con ingresos y egresos del período.
- Transferir a una cuenta propia o a otra cuenta (por UUID), con recibo.
- Pagar servicios.
- Registrar y consultar beneficiarios.
- Revisar el historial de transferencias y pagos con búsqueda y filtro.

---

## Tabla de contenido

1. [Stack](#stack)
2. [Requisitos](#requisitos)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Configuración de la API](#configuración-de-la-api)
5. [Comandos](#comandos)
6. [Credenciales de prueba](#credenciales-de-prueba)
7. [Pantallas y navegación](#pantallas-y-navegación)
8. [Arquitectura](#arquitectura)
9. [Autenticación y seguridad](#autenticación-y-seguridad)
10. [Reglas de negocio en la app](#reglas-de-negocio-en-la-app)
11. [Pruebas y evidencias](#pruebas-y-evidencias)
12. [Limitaciones conocidas](#limitaciones-conocidas)
13. [Solución de problemas](#solución-de-problemas)
14. [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)

---

## Stack

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Expo (managed workflow) | SDK 58 |
| Runtime | React Native / React | 0.88 / 19 |
| Lenguaje | TypeScript (modo estricto) | 6.0 |
| Navegación | React Navigation: native stack + bottom tabs | 7 |
| Almacenamiento seguro | `expo-secure-store` (Keychain / Keystore) | 58 |
| Claves de idempotencia | `expo-crypto` (UUID v4) | 58 |
| Detección del host | `expo-constants` | 58 |
| Íconos | `@expo/vector-icons` (Ionicons) | 15 |
| Vista web (solo desarrollo) | `react-native-web` | 0.21 |

Identificadores de la app (`app.json`): nombre **SecureBank**, paquete
`com.securebank.mobile` (Android e iOS), esquema `securebank://`, orientación
vertical.

## Requisitos

- **Node.js 20** o superior y npm.
- **Backend de SecureBank** corriendo y accesible en el puerto `3000`.
- Una de estas opciones para ver la app:
  - **Expo Go** en un teléfono Android o iOS (en la misma red Wi-Fi que la
    computadora).
  - **Emulador de Android** (Android Studio).
  - **Simulador de iOS** (solo macOS con Xcode).
  - Navegador, solo como vista previa de desarrollo.

## Puesta en marcha

### 1. Levantar la infraestructura y el backend

Desde la raíz del repositorio:

```bash
cp .env.example .env            # ajusta contraseñas y JWT_SECRET
docker compose up -d            # PostgreSQL, Redis y RabbitMQ

cd backend
npm install
npx prisma migrate deploy
npm run start:dev               # API en http://localhost:3000/api
```

### 2. Levantar la app

En otra terminal:

```bash
cd mobile
npm install
npm start
```

Luego:

1. Escanea el código QR con **Expo Go** (Android) o con la **cámara** (iOS).
2. Espera a que cargue el bundle.
3. Inicia sesión con un usuario de prueba.

## Configuración de la API

La app decide a qué URL llamar en este orden (`src/services/api.ts`):

| Prioridad | Origen | Cuándo aplica |
|---|---|---|
| 1 | `EXPO_PUBLIC_API_URL` | Si está definida en `.env`, siempre gana. |
| 2 | IP de la computadora que sirve Expo (`hostUri`) | Expo Go o teléfono físico en la misma red. |
| 3 | `http://10.0.2.2:3000/api` | Emulador de Android (`10.0.2.2` es el host). |
| 4 | `http://localhost:3000/api` | Simulador de iOS y vista web. |

En la mayoría de los casos **no hace falta configurar nada**. Si necesitas
forzar la URL (por ejemplo, el backend corre en otra máquina):

```bash
cp .env.example .env
```

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

Reinicia Expo después de cambiar `.env` (`npm start -- --clear`).

> El teléfono y la computadora deben estar en la misma red, y el firewall debe
> permitir conexiones entrantes al puerto `3000`. La URL que usa la app se
> muestra en la pantalla **Más** y en los mensajes de error de conexión.

## Comandos

| Comando | Descripción |
|---|---|
| `npm start` | Inicia Metro y muestra el QR para Expo Go. |
| `npm run android` | Abre la app en un emulador o dispositivo Android. |
| `npm run ios` | Abre la app en el simulador de iOS (macOS). |
| `npm run web` | Vista previa en el navegador (solo desarrollo). |
| `npm run typecheck` | Verifica tipos con `tsc --noEmit`. |
| `npx expo-doctor` | Revisa que dependencias y configuración sean compatibles con el SDK. |
| `npx expo export --platform android` | Genera el bundle de Android en `dist/` para verificar que compila. |

## Credenciales de prueba

| Usuario | Contraseña | Cuenta |
|---|---|---|
| `cliente@securebank.test` | `ClienteDemo2026!` | `SB-10000001` |
| `destino.transfer.test@securebank.test` | `DestinoDemo2026!` | `SB-10000002` |

Las credenciales solo aparecen en la pantalla de login cuando la app corre en
modo desarrollo (`__DEV__`). En un build de producción no se muestran.

## Pantallas y navegación

La app usa un **stack raíz** que decide qué mostrar según la sesión, y dentro de
la sesión una **barra de pestañas** inferior.

```
RootNavigator (stack)
├── Splash            # mientras se restaura la sesión guardada
├── Login             # sin sesión
└── con sesión
    ├── App → MainTabs (pestañas)
    │   ├── Inicio        (Dashboard)
    │   ├── Movimientos   (Movements)
    │   ├── Transferir    (Transfer)
    │   ├── Pagos         (Payments)
    │   └── Más           (More)
    ├── Beneficiaries     # se abre como modal desde "Más"
    └── History           # pantalla del stack desde "Más"
```

| Pantalla | Qué hace | Endpoints |
|---|---|---|
| Login | Correo y contraseña; muestra credenciales demo en desarrollo. | `POST /auth/login` |
| Inicio | Saldo total, cuentas con estado y accesos rápidos. | `GET /accounts` |
| Movimientos | Cargos y abonos por cuenta, con totales de ingresos y egresos. | `GET /accounts`, `GET /accounts/:id/transactions` |
| Transferir | Cuenta propia o externa (UUID), validación, recibo e idempotencia. | `GET /accounts`, `POST /transfers` |
| Pagos | Cuenta de cargo, servicio, referencia y monto. | `GET /accounts`, `GET /payments`, `POST /payments` |
| Más | Perfil, accesos a beneficiarios e historial, URL de la API y cierre de sesión. | — |
| Beneficiarios | Alta y lista de contactos. | `GET /beneficiaries`, `POST /beneficiaries` |
| Historial | Transferencias y pagos con búsqueda y filtro por estado. | `GET /transfers`, `GET /payments` |

Las pantallas recargan sus datos al volver a ellas (`useRefreshOnFocus`), por
ejemplo, el saldo de Inicio se actualiza después de una transferencia.

## Arquitectura

```
mobile/
├── index.ts                 # Registra el componente raíz en Expo
├── App.tsx                  # SafeAreaProvider → AuthProvider → RootNavigator
├── app.json                 # Configuración de Expo (nombre, íconos, plugins)
├── assets/                  # Ícono, splash e íconos adaptativos de Android
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx  # Splash, login o app según la sesión
│   │   ├── MainTabs.tsx       # Barra de pestañas inferior
│   │   └── types.ts           # Tipos de parámetros de cada ruta
│   ├── screens/             # Una pantalla por flujo
│   ├── components/          # UI reutilizable: AppText, Button, Input,
│   │                        # SelectField, SegmentedControl, Card, Badge,
│   │                        # Alert, Avatar, DataState, DetailRow, IconButton,
│   │                        # KeyHint, Screen, ScreenHeader
│   ├── contexts/            # AuthProvider y contexto de autenticación
│   ├── hooks/               # useAuth, useApiQuery, useRefreshOnFocus
│   ├── services/
│   │   ├── api.ts           # Cliente HTTP y resolución de la URL
│   │   ├── storage.ts       # SecureStore (nativo) / localStorage (web)
│   │   └── *.service.ts     # Un servicio por módulo de la API
│   ├── types/               # Tipos del contrato de la API
│   ├── utils/               # format, validation, labels, idempotency
│   └── theme.ts             # Colores, espacios, radios y sombras
├── .env.example
├── package.json
└── tsconfig.json
```

### Flujo de una petición

```
Pantalla ──► servicio (p. ej. transfers.service.ts)
                │
                ▼
           apiRequest()  (services/api.ts)
             • lee el token de SecureStore y agrega Authorization: Bearer
             • corta la petición a los 15 s
             • convierte errores del backend en ApiError(status, mensaje, detalles)
             • si responde 401 → borra el token y llama al handler de AuthProvider
                │
                ▼
           http://<host>:3000/api  (NestJS)
```

- **`useApiQuery`** devuelve `{ data, loading, error, reload }` para pintar los
  estados de carga, error y vacío.
- **`AuthProvider`** registra con `setUnauthorizedHandler` la función que
  cierra la sesión; al cambiar `isAuthenticated`, el `RootNavigator` muestra el
  login.
- **`theme.ts`** concentra los colores y medidas; los componentes no usan
  valores sueltos.

## Autenticación y seguridad

- El login guarda el `access_token` y el usuario en **`expo-secure-store`**
  (Keychain en iOS, Keystore en Android), no en almacenamiento plano.
- En la vista web se usa `localStorage` como respaldo, porque SecureStore no
  existe en el navegador. Esa vista es solo para desarrollo.
- Al abrir la app se muestra un splash mientras se restaura la sesión. Si falta
  el token o el usuario, se limpian ambos y se muestra el login.
- El token se envía como `Authorization: Bearer <token>` en cada petición
  autenticada. Dura **1 hora** y no hay refresh token.
- Un **401** borra la sesión y regresa al login automáticamente.
- No se guardan contraseñas.

## Reglas de negocio en la app

### Montos

- Entre **0.01 y 1,000,000.00**, con máximo **dos decimales**
  (`utils/validation.ts`). Acepta coma o punto decimal.
- Se muestran con `Intl.NumberFormat('es-GT')` en la moneda de la cuenta (GTQ
  por defecto).

### Transferencias

El backend exige, y la pantalla lo explica al usuario:

1. La cuenta de origen debe pertenecer al usuario y estar `ACTIVE`.
2. La cuenta destino debe existir y estar `ACTIVE`.
3. Origen y destino deben ser diferentes.
4. Ambas cuentas deben usar la misma moneda.
5. El saldo de origen debe cubrir el monto.
6. El destino se envía como `destinationAccountId` (**UUID**). Para cuentas
   externas, la app valida el formato UUID antes de enviar.

### Idempotencia (evitar cobros duplicados)

- Cada operación lleva una `idempotencyKey` generada con `expo-crypto`.
- Si la petición falla por red, timeout o `409`, se **conserva la misma clave**
  para el reintento.
- Solo se genera una clave nueva después de una operación exitosa (al pulsar
  "nueva transferencia" tras el recibo).
- Un `409` indica que la operación ya se registró: revisa el historial antes
  de reintentar.

## Pruebas y evidencias

### Selectores para pruebas E2E

Los elementos clave tienen `testID` (útil para Maestro o Detox):

| Flujo | `testID` |
|---|---|
| Login | `login-email`, `login-password`, `login-submit` |
| Transferencia | `transfer-submit` |
| Pagos | `payment-submit` |

### Dónde va cada cosa

| Qué | Carpeta |
|---|---|
| Flujos E2E móviles (Maestro) | `tests/maestro/` |
| Capturas de los flujos | `reports/mobile/` |

### Flujos verificados

Probados contra el backend local (con la vista web de Expo en lugar del
emulador); las capturas están en `reports/mobile/`:

- Login, restauración de sesión, cierre de sesión y reingreso.
- Inicio con saldo total y cuentas.
- Transferencia entre cuentas propias y a cuenta externa por UUID, con recibo.
- Movimientos por cuenta con ingresos, egresos y detalle.
- Alta y listado de beneficiarios.
- Pago de servicio con actualización de saldo.
- Historial con búsqueda y filtro por estado.

Los datos de prueba se eliminaron al terminar y los saldos se restauraron.

### Verificación antes de un PR

```bash
npm run typecheck
npx expo-doctor
npx expo export --platform android
```

## Limitaciones conocidas

1. No hay búsqueda por número de cuenta ni por beneficiario: transferir a otra
   cuenta requiere su UUID. Los beneficiarios son solo una agenda.
2. No hay refresh token ni `GET /me`; la sesión se reconstruye desde
   SecureStore y dura 1 hora.
3. Los listados no están paginados; el historial se filtra en el teléfono.
4. El backend no habilita CORS, así que la **vista web** de Expo no puede
   llamar a la API sin un proxy. En Android e iOS no aplica CORS.
5. La API corre por HTTP. Los builds independientes de Android/iOS bloquean HTTP
   en texto plano; para producción se necesita HTTPS.
6. La vista web es solo una ayuda de desarrollo; la app está pensada para
   Android e iOS.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "No se pudo conectar con el servidor (URL)" | El teléfono no llega a la API. | Misma red Wi-Fi, backend corriendo, puerto 3000 abierto en el firewall. Prueba la URL en el navegador del teléfono. |
| Funciona en el emulador pero no en el teléfono | La URL detectada no es la IP LAN correcta. | Define `EXPO_PUBLIC_API_URL` con la IP de tu computadora y reinicia con `npm start -- --clear`. |
| El QR no conecta con Expo Go | Red con aislamiento de clientes o VPN. | Usa `npx expo start --tunnel` o conecta ambos equipos a otra red. |
| Error de CORS en `npm run web` | El backend no permite el origen del navegador. | Prueba en Android/iOS, o habilita CORS solo en local. |
| Los cambios en `.env` no se aplican | Metro guarda la caché del bundle. | `npm start -- --clear`. |
| Me saca al login de repente | El JWT expiró (1 hora). | Inicia sesión otra vez. |
| 409 al transferir o pagar | La clave de idempotencia ya se usó. | Revisa el historial antes de reintentar. |

## Flujo de trabajo con Git

- `main`: producción (protegida).
- `develop`: integración.
- `feature/mobile`: desarrollo de esta app.
- Los cambios entran a `develop` mediante Pull Request.
- Commits con Conventional Commits:
  `feat(mobile): ...`, `fix(mobile): ...`, `test(mobile): ...`.
- No se suben `.env`, `node_modules/`, `dist/` ni las carpetas nativas
  `android/` e `ios/`.
