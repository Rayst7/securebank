# SecureBank Mobile

Aplicación móvil de banca digital de SecureBank, construida con **React Native + Expo + TypeScript**. Consume la misma API REST que el frontend web (`/api`).

## Stack

- Expo SDK 58 / React Native 0.88 / React 19
- TypeScript estricto
- React Navigation 7 (stack + bottom tabs)
- `expo-secure-store` para el token y el usuario
- `expo-crypto` para claves de idempotencia (UUID v4)
- `@expo/vector-icons` (Ionicons)

## Requisitos

- Node.js 20 o superior
- Backend de SecureBank en ejecución (`http://localhost:3000/api`)
- Expo Go en un teléfono, un emulador de Android/iOS, o un navegador para la vista previa web

## Instalación

```bash
cd mobile
npm install
```

## Configuración de la API

La app resuelve la URL de la API en este orden:

1. `EXPO_PUBLIC_API_URL`, si está definida.
2. La IP de la computadora que sirve Expo (`Constants.expoConfig.hostUri`), útil en Expo Go y en un teléfono físico.
3. `http://10.0.2.2:3000/api` en el emulador de Android.
4. `http://localhost:3000/api` en iOS Simulator y web.

Copia `.env.example` a `.env` solo si necesitas forzar la URL:

```bash
cp .env.example .env
```

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

> El teléfono y la computadora deben estar en la misma red. Si el backend corre en Docker o en otro equipo, verifica que el puerto `3000` sea accesible desde la red local.

## Ejecutar

```bash
npm start          # abre Expo Dev Tools
npm run android    # emulador o dispositivo Android
npm run ios        # simulador iOS (macOS)
npm run web        # vista previa en el navegador
```

Con Expo Go:

1. Ejecuta `npm start`.
2. Escanea el código QR con Expo Go (Android) o con la cámara (iOS).
3. Inicia sesión con un usuario de prueba.

## Credenciales de prueba

| Usuario | Contraseña |
|---|---|
| `cliente@securebank.test` | `ClienteDemo2026!` |
| `destino.transfer.test@securebank.test` | `DestinoDemo2026!` |

Las credenciales de prueba solo se muestran en la pantalla de login cuando `__DEV__` es verdadero.

## Pantallas

- **Inicio:** saldo total, cuentas, estado y accesos rápidos.
- **Movimientos:** cargos y abonos por cuenta, con ingresos/egresos del período.
- **Transferir:** transferencia a una cuenta propia o a una cuenta externa por UUID, con recibo e idempotencia.
- **Pagos:** pago de servicios con cuenta de cargo, referencia y monto.
- **Más:** perfil, beneficiarios, historial, información de la API y cierre de sesión.
- **Beneficiarios:** alta y consulta de contactos (pantalla del stack).
- **Historial:** transferencias y pagos con búsqueda y filtro por estado (pantalla del stack).

## Arquitectura

```
mobile/
├── App.tsx
├── src/
│   ├── components/     # UI reutilizable (Button, Input, SelectField, Card…)
│   ├── contexts/       # AuthProvider y contexto de autenticación
│   ├── hooks/          # useAuth, useApiQuery, useRefreshOnFocus
│   ├── navigation/     # stack raíz, tabs y tipos de rutas
│   ├── screens/        # pantallas de la app
│   ├── services/       # cliente HTTP y servicios por dominio
│   ├── types/          # contrato de la API
│   ├── utils/          # formato, validación, etiquetas e idempotencia
│   └── theme.ts        # colores, espacios, radios y sombras
├── app.json
└── .env.example
```

## Autenticación y seguridad

- El login guarda el `access_token` y el usuario en `expo-secure-store` (Keychain en iOS, Keystore en Android).
- En web se usa `localStorage` como respaldo para la vista previa.
- Un `401` borra la sesión y devuelve al login automáticamente.
- El token se adjunta como `Authorization: Bearer <token>` en cada solicitud autenticada.
- No se guardan contraseñas.

## Reglas de transferencia

El backend exige:

1. La cuenta de origen debe pertenecer al usuario autenticado y estar `ACTIVE`.
2. La cuenta destino debe existir y estar `ACTIVE`.
3. Origen y destino deben ser diferentes.
4. Ambas cuentas deben usar la misma moneda.
5. El monto debe estar entre `0.01` y `1,000,000.00`, con máximo dos decimales.
6. El saldo de la cuenta de origen debe cubrir el monto.
7. Cada operación requiere una `idempotencyKey` única por cuenta de origen. Repetirla devuelve `409`.
8. El destino se envía como `destinationAccountId` (**UUID**). Los beneficiarios son solo una agenda: el endpoint no acepta `beneficiaryId` ni `accountNumber`.

La app conserva la clave de idempotencia si la solicitud falla por red, timeout o `409`, y solo genera una nueva después de una operación exitosa. Si hay `409`, se debe revisar el historial antes de reintentar.

## Limitaciones conocidas

- La API no tiene búsqueda por número de cuenta ni por beneficiario; la transferencia externa requiere el UUID de la cuenta destino.
- No hay refresh token ni `GET /me`; la sesión se reconstruye desde el almacenamiento local.
- Los listados no están paginados; el historial se filtra en el cliente.
- El backend no habilita CORS. La vista web de Expo requiere un proxy o ejecutar Chrome con la seguridad web deshabilitada solo para pruebas locales. En Android/iOS no aplica CORS.
- En builds independientes, Android/iOS pueden bloquear HTTP en texto plano. Para producción usa HTTPS y una URL de API segura.
- La vista web es solo una ayuda de desarrollo; la app está pensada para Android/iOS.

## Verificación

```bash
npm run typecheck
npx expo-doctor
npx expo export --platform android
```

Flujos verificados contra el backend local (vista web de Expo como sustituto del emulador):

- Login, restauración de sesión, cierre de sesión y reingreso.
- Dashboard con saldo total y cuentas.
- Transferencia entre cuentas propias y a una cuenta externa por UUID, con recibo e idempotencia.
- Movimientos por cuenta con ingresos, egresos y detalle.
- Alta y listado de beneficiarios.
- Pago de servicio con actualización de saldo.
- Historial de transferencias y pagos con búsqueda y filtro por estado.

Los datos de prueba se eliminaron al terminar y los saldos se restauraron.

## Ramas

- `main`: producción (protegida).
- `develop`: integración.
- `feature/mobile`: desarrollo de esta app.

Los cambios se integran a `develop` mediante Pull Request.
