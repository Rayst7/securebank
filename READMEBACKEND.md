}SecureBank
API backend para una aplicación bancaria de demostración, desarrollada con NestJS, TypeScript, Prisma y PostgreSQL. El proyecto se trabaja como parte del proyecto final de Aseguramiento de la Calidad de Software, con énfasis en el backend y en la futura integración de servicios de infraestructura.
Estado actual: autenticación JWT y consultas de cuentas implementadas. Los módulos de beneficiarios, transferencias, pagos, auditoría, Redis y RabbitMQ siguen pendientes de completar e integrar.

Tecnologías
- Node.js / TypeScript
- NestJS para la API REST
- PostgreSQL 16 como base de datos principal
- Prisma ORM 7 para el acceso a datos y las migraciones
- JWT para autenticar las solicitudes
- bcrypt para verificar contraseñas
- Docker Compose para levantar PostgreSQL y Redis
- Redis 7 disponible en el entorno de desarrollo; su integración funcional con la API está pendiente
- RabbitMQ previsto para la publicación y el consumo de eventos; integración pendiente
Funcionalidad implementada
Autenticación
- POST /api/auth/login
- Validación de credenciales y contraseña mediante bcrypt.
- Emisión de un token JWT para las solicitudes autenticadas.
- Protección de las rutas de cuentas mediante un guard JWT.
- Validación global de DTOs con ValidationPipe, incluyendo whitelist y rechazo de propiedades no permitidas.
Cuentas
- GET /api/accounts: devuelve las cuentas del usuario autenticado.
- GET /api/accounts/:id/transactions: consulta las transacciones asociadas a una cuenta que pertenezca al usuario autenticado.
- La consulta de transacciones responde con una lista vacía ([]) cuando no hay movimientos registrados.
Base de datos
El esquema Prisma incluye modelos para:
- Usuarios
- Cuentas
- Beneficiarios
- Transferencias
- Pagos
- Transacciones
- Registros de auditoría
La migración inicial del esquema bancario se aplicó a PostgreSQL. Que un modelo exista en el esquema no significa que su módulo o endpoint ya esté implementado.
Requisitos previos
- Node.js compatible con las versiones de NestJS y las dependencias instaladas.
- npm.
- Docker Engine y Docker Compose.
- Git.
Comprueba las versiones instaladas:
node --version
npm --version
docker --version
docker compose version
Configuración local
Los siguientes pasos asumen que estás dentro del directorio backend.
1. Instalar dependencias
npm install
2. Configurar variables de entorno
Crea backend/.env a partir de un archivo de ejemplo si el repositorio lo incluye. Si no existe, crea el archivo localmente con las variables necesarias:
PORT=3000
DATABASE_URL="postgresql://securebank:CAMBIAR_PASSWORD@localhost:5433/securebank?schema=public"
JWT_SECRET="REEMPLAZAR_POR_UN_SECRETO_ALEATORIO"
JWT_EXPIRES_IN="1h"
REDIS_HOST="localhost"
REDIS_PORT=6379
RABBITMQ_URL="amqp://localhost:5672"
Ajusta la contraseña de PostgreSQL para que coincida con la configurada en Docker Compose. Genera un secreto JWT propio; no uses el valor de ejemplo en un entorno real.
No subas backend/.env, contraseñas, tokens JWT ni secretos al repositorio. Mantén el archivo .env excluido por Git y comparte únicamente un .env.example sin credenciales reales.
3. Levantar los servicios de infraestructura
Desde el directorio donde se encuentra el archivo compose.yaml o docker-compose.yml:
docker compose up -d
docker compose ps
En el entorno de desarrollo configurado actualmente, PostgreSQL 16 se publica en 127.0.0.1:5433 y Redis 7 en el puerto 6379. El puerto 5433 se utiliza para evitar el PostgreSQL local que ocupa el puerto 5432.
4. Aplicar las migraciones
Desde backend, una vez configurada DATABASE_URL:
npx prisma migrate dev
npx prisma generate
La configuración de Prisma 7 del proyecto usa prisma7.config.ts, el esquema prisma/schema.prisma y el cliente generado bajo src/generated/prisma. Si el repositorio ya contiene migraciones aplicadas, revisa su estado antes de crear una migración nueva.
5. Iniciar el backend
npm run start:dev
La API utiliza el prefijo global /api; por defecto escucha en el puerto 3000.
Endpoints disponibles
Todas las rutas protegidas requieren el encabezado Authorization: Bearer <token>.
Método	Endpoint	Autenticación	Descripción
POST	/api/auth/login	No	Inicia sesión y devuelve un token JWT.
GET	/api/accounts	Sí	Lista las cuentas del usuario autenticado.
GET	/api/accounts/:id/transactions	Sí	Lista las transacciones de una cuenta propia.


Pruebas manuales
Iniciar sesión
Usa credenciales de desarrollo creadas en tu entorno local. No incluyas contraseñas reales en archivos de documentación ni en el historial compartido de comandos.
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"CORREO_DE_PRUEBA","password":"CONTRASEÑA_DE_PRUEBA"}'
La respuesta exitosa incluye access_token. Guárdalo localmente en una variable de entorno sin publicarlo:
read -rsp "Token JWT: " TOKEN
echo
Consultar las cuentas
curl -i http://localhost:3000/api/accounts \
  -H "Authorization: Bearer $TOKEN"
Consultar transacciones de una cuenta
Sustituye el identificador por el UUID de una cuenta de prueba perteneciente al usuario autenticado:
curl -i http://localhost:3000/api/accounts/UUID_DE_LA_CUENTA/transactions \
  -H "Authorization: Bearer $TOKEN"
Al terminar, elimina el token de la sesión de terminal:
unset TOKEN
Estructura relevante
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── scripts/
│   ├── create-test-user.ts
│   └── create-test-account.ts
├── src/
│   ├── accounts/
│   │   ├── accounts.controller.ts
│   │   ├── accounts.module.ts
│   │   └── accounts.service.ts
│   ├── auth/
│   │   ├── dto/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── jwt-auth.guard.ts
│   │   └── jwt.strategy.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── generated/
│   │   └── prisma/
│   ├── app.module.ts
│   └── main.ts
├── prisma7.config.ts
└── package.json
La estructura puede variar a medida que se integren nuevos módulos.
Trabajo pendiente
- Implementar GET /api/beneficiaries y POST /api/beneficiaries.
- Implementar transferencias y pagos con validaciones de negocio y transacciones de base de datos.
- Añadir controles de concurrencia e idempotencia para evitar operaciones duplicadas.
- Registrar eventos de auditoría para las operaciones relevantes.
- Integrar Redis para caché, sesiones o limitación de solicitudes, con expiración e invalidación.
- Integrar RabbitMQ para publicar y consumir eventos, con manejo de reintentos y mensajes fallidos.
- Completar pruebas unitarias, de integración y de seguridad.
- Documentar los contratos de la API y preparar evidencias de las pruebas.
Seguridad y buenas prácticas
- No almacenar contraseñas en texto plano; utilizar hashing seguro.
- No confiar en identificadores enviados por el cliente para autorizar el acceso a cuentas.
- Validar y limitar los datos de entrada.
- No registrar ni compartir contraseñas, tokens JWT ni secretos.
- No utilizar las credenciales de prueba en producción.
- Antes de desplegar, revisar las vulnerabilidades de las dependencias y definir una configuración segura para secretos, CORS, límites de solicitudes, logs y HTTPS.
Desarrollo
Los comandos habituales disponibles dependen de los scripts definidos en backend/package.json. Para consultar los scripts:
npm run
Antes de integrar cambios, ejecuta las pruebas y la compilación disponibles en el proyecto, y revisa que no se hayan incluido archivos .env ni credenciales en Git.