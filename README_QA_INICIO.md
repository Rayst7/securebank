# Kit inicial de automatización QA — SecureBank

**Este kit contiene código de prueba y plantillas, NO resultados ejecutados.** Se preparó revisando `securebank.zip` el 4 de noviembre de 2026.
Los resultados reales solo se obtienen ejecutándolo contra tu ambiente QA. Debes integrar estos archivos en `qa/securebank-automatizacion`.

## A. Obtener el repositorio correcto en Windows (PowerShell)

```powershell
git clone https://github.com/Rayst7/securebank.git
cd securebank
git fetch origin
# Si ya existe la rama local:
git switch qa/securebank-automatizacion
# Si no existe local, pero sí en remoto:
# git switch --track origin/qa/securebank-automatizacion
# Si no existe en remoto, crear desde main:
# git switch -c qa/securebank-automatizacion origin/main
git status -sb
```

Descomprimir el ZIP de este kit y copiar las carpetas/archivos a la raíz de la copia clonada, **sin sobrescribir código de otros compañeros**. Inspeccionar cambios con `git diff --stat` y `git status`.
Agregar reglas de `.gitignore.qa-sugerido.txt` al `.gitignore` y revisar `git status`.

## B. Diagnóstico inicial (no implica aprobar pruebas)

```powershell
node --version
npm --version
docker --version
docker compose version
git status -sb
docker compose -f docker-compose.yml config
```

**Problema a coordinar con DevOps:** el ZIP tiene `${RABBITMQ_PASSWORD:UmgAdminQA}` en `docker-compose.yml`; la sintaxis de default correcta es `${RABBITMQ_PASSWORD:-...}`. No publicar una contraseña real como valor por defecto. Definirla en `.env` fuera de Git y usar `${RABBITMQ_PASSWORD:?Define RABBITMQ_PASSWORD}`. El segundo `compose.yaml` no define RabbitMQ.

**Problema a coordinar con Backend:** `backend/package.json` no declara directamente `ioredis` ni `amqplib`, aunque la raíz sí. Solicitar su incorporación a las dependencias reales del backend y validación del build aislado. El código espera `RABBITMQ_URL`, mientras el `.env.example` raíz solo ofrece `RABBITMQ_HOST` y `RABBITMQ_PORT`.

**Bloqueado:** no hay código de aplicación móvil, Terraform/Ansible operativos ni Jenkinsfile en el archivo revisado.

## C. Dependencias y servicios

1. Crear `.env` raíz local con `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD`; usar valores fuertes y diferentes de cualquier entorno real. No subirlo.
2. Tras corregir la línea Compose en PR coordinado y aprobar `docker compose config`, levantar la infraestructura:

```powershell
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps
docker exec securebank-postgres pg_isready -U securebank
```

3. Crear BD QA aislada **una vez** (el usuario/BD de ejemplo solo funcionan si son los configurados por tu equipo):

```powershell
docker exec securebank-postgres psql -U securebank -d postgres -c 'CREATE DATABASE securebank_qa;'
```

Si ya existe, NO borrarla ni resetearla: verificar acceso. Nunca ejecutar contra producción.

4. Instalar paquetes desde las carpetas correspondientes:

```powershell
npm ci
cd backend; npm ci
cd ../frontend; npm ci
cd ..
npm install --save-dev cypress
npx cypress verify
```

5. Crear `backend/.env` local con `PORT=3000`, `DATABASE_URL=postgresql://...@127.0.0.1:5433/securebank_qa?schema=public`, `JWT_SECRET` largo y aleatorio, `REDIS_URL=redis://127.0.0.1:6379` y `RABBITMQ_URL=amqp://usuario:clave@127.0.0.1:5672`. Codificar caracteres especiales de URL en credenciales. No registrar ni capturar secretos.

6. Aplicar migraciones a QA, con el archivo backend/.env apuntando a `securebank_qa`:

```powershell
cd backend
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run build
cd ..
```

`migrate deploy` modifica la BD **objetivo configurada**; verificar antes que es QA. No usar `migrate reset` ni `docker compose down -v` en una base compartida.

7. Sembrar dos usuarios sintéticos y cuentas. El repositorio ya trae scripts:

```powershell
cd backend
npx tsx scripts/create-test-user.ts
npx tsx scripts/create-test-account.ts
npx tsx scripts/create-transfer-test-user.ts
cd ..
```

**Advertencia:** estos scripts usan credenciales conocidas en el código: solo entorno local de pruebas. Solicitar a backend hacerlas configurables y excluirlas de presentaciones públicas. **Confirmar** el saldo disponible; `create-test-account.ts` no reinicia saldo si la cuenta ya existe.

8. En terminal 1 iniciar backend desde `backend/` con `npm run start:dev`. En terminal 2 iniciar frontend desde `frontend/` con `npm run dev`. Verificar `http://127.0.0.1:3000/api` y `http://127.0.0.1:5173/login`.

## D. Variables locales para pruebas

En la misma terminal PowerShell (no escribir valores reales en archivos versionados):

```powershell
$env:QA_API_URL='http://127.0.0.1:3000'
$env:QA_WEB_URL='http://127.0.0.1:5173'
$env:QA_EMAIL=Read-Host 'Correo usuario QA A'
$env:QA_PASSWORD=Read-Host 'Contraseña usuario QA A' -MaskInput
$env:QA_OTHER_EMAIL=Read-Host 'Correo usuario QA B'
$env:QA_OTHER_PASSWORD=Read-Host 'Contraseña usuario QA B' -MaskInput
$env:CYPRESS_qaEmail=$env:QA_EMAIL
$env:CYPRESS_qaPassword=$env:QA_PASSWORD
```

En PowerShell 5.1, `-MaskInput` puede no existir; usar `[System.Net.NetworkCredential]::new('',(Read-Host -AsSecureString)).Password` con precaución. Cerrar la terminal tras terminar para descartar variables.

## E. Ejecutar suites y guardar evidencias

```powershell
.\scripts\Ejecutar-QA.ps1 -Tipo unit
.\scripts\Ejecutar-QA.ps1 -Tipo api
.\scripts\Ejecutar-QA.ps1 -Tipo web
.\scripts\Ejecutar-QA.ps1 -Tipo audit-backend
.\scripts\Ejecutar-QA.ps1 -Tipo audit-frontend
```

Si la política de PowerShell impide scripts, ejecutar en la terminal actual `Set-ExecutionPolicy -Scope Process Bypass` tras comprobar el origen del script; no modificar la política del sistema.

**Integraciones reales Redis / RabbitMQ:**

```powershell
node --test tests/integration/redis.test.mjs
$env:QA_DB_ISOLATED='YES'
$env:QA_BROKER_TESTS='1'
$env:QA_RABBITMQ_URL=Read-Host 'URL del broker RabbitMQ exclusivo para QA'
node --test tests/integration/rabbitmq.test.mjs
```

La prueba Rabbit publica **un mensaje intencionalmente malformado** y comprueba crecimiento de DLQ, por lo que únicamente se ejecuta en cola/broker exclusivos de QA. Si el broker es compartido, omitirla hasta aislarlo. El test no purga la DLQ. La prueba Redis crea claves sintéticas y las retira al finalizar. HIT/MISS de caché de cuentas aún no pueden acreditarse: el backend revisado no implementa ese caché.

**Pruebas bancarias que ALTERAN saldos:** verificar que ambas cuentas son exclusivamente QA, que la base es `securebank_qa`, y después habilitar:

```powershell
$env:QA_DB_ISOLATED='YES'
$env:QA_WRITE_TESTS='1'
.\scripts\Ejecutar-QA.ps1 -Tipo api
```

El script API hace **exactamente** un doble envío secuencial y otro paralelo de 8 solicitudes con misma clave, verificando saldos de ambas cuentas y HTTP. Revisa también `transactions` y `audit_logs` en PostgreSQL para confirmar las invariantes. Si falla, registra bug y no modifiques la prueba para forzar resultado verde.

**Rendimiento, una suite por corrida:** instalar k6 (Windows) y usar un QA aislado, con umbrales preaprobados:

```powershell
.\scripts\Ejecutar-QA.ps1 -Tipo load
.\scripts\Ejecutar-QA.ps1 -Tipo stress
.\scripts\Ejecutar-QA.ps1 -Tipo spike
```

Revisar `reports/qa-evidence/<fecha>-<tipo>/summary.json` y logs. Se prueban solo consultas de saldo, para no introducir transferencias artificiales durante la carga.

**Insomnia:** abrir la app, importar `tests/api/securebank.postman_collection.json`, crear ambiente QA con 4 variables (`qaEmail`, `qaPassword`, `qaOtherEmail`, `qaOtherPassword`) y URL local. Verificar scripts After-response y orden de ejecución; exportar la colección final como YAML v5 a `tests/api/securebank.insomnia.yaml`. Probar:

```powershell
inso --version
inso run collection 'SecureBank QA - ejecución automatizada y negativa' --workingDir tests/api/securebank.insomnia.yaml --ci --reporter spec --output reports/qa-evidence/inso-resultado.json
```

La CLI puede requerir el ID de workspace en lugar del nombre según la versión/exportación; obtenerlo con Insomnia y no inventarlo. El informe JSON puede contener peticiones, cuerpos o credenciales: revisar antes de publicar.

## F. Planes, defectos e informe

- Plan obligatorio: `docs/plan-pruebas-qa.md` (20 apartados).
- Inventario de casos: `docs/matriz-casos-prueba.csv`.
- Riesgos: `docs/matriz-riesgos-qa.csv`.
- Registro de bugs: `docs/registro-defectos.csv` y GitHub Issues.
- Informe final: `docs/informe-qa-securebank-plantilla.docx` (Word editable) y `docs/informe-final-qa-plantilla.md`, **rellenar solo con resultados reales**.
- Evidencias: `reports/qa-evidence/` ignorado por Git. Para un curso con videos, subir un conjunto revisado y anonimizado como artefactos Jenkins o adjuntos GitHub/almacenamiento autorizado; poner links en docs.

Para guardar la corrida con metadatos: `./scripts/Guardar-Evidencia.ps1 -Origen reports/qa-evidence/cypress -Tipo cypress -Caso WEB-03`.

**Notas de seguridad:** ningún test de ZAP activo, concurrencia de escrituras, DDoS o fuzzing fuera del entorno QA propio. No dejar contraseñas en capturas ni videos.

## G. Fases con otros integrantes

- Backend: endpoints definitivos, usuarios QA reproducibles, Redis HIT/MISS/TTL/invalidez, y contrato de eventos.
- Mobile: APK e identificador appId; crear 5–8 flujos Maestro según los controles reales.
- DevOps: Jenkinsfile, SonarQube, Fortify (acceso/licencia), Dockerfiles, Ansible, IaC, ambiente QA remoto y publicación protegida.
- QA: pruebas, matriz, evidencias, defectos, regresiones y GO/NO-GO.

## H. Subir solamente archivos válidos

```powershell
git status --short
git diff --check
git add cypress.config.cjs tests/ docs/ scripts/ README_QA_INICIO.md
git add package.json package-lock.json .gitignore  # SOLO si realmente los modificaste y revisaste
git diff --cached --stat
git commit -m "test(qa): agrega automatizacion API web rendimiento y plan de pruebas"
git push -u origin qa/securebank-automatizacion
```

Abrir PR desde `qa/securebank-automatizacion` hacia `main`; adjuntar matriz, pruebas ejecutadas, limitaciones, issues y enlace a evidencias. No hacer merge sin revisión ni forzar el pipeline.

## I. Rendimiento de transferencias (prueba adicional obligatoria)

Las corridas `load/stress/spike` de la sección E miden consultas **GET /api/accounts**.
Para completar la exigencia de desempeño de **POST /api/transfers**, existe otro script,
intencionalmente separado y bloqueado por seguridad. Requiere un destino UUID real de QA,
cuentas financiadas, broker aislado, saldo suficiente y aprobación del equipo.

```powershell
$env:QA_DB_ISOLATED='YES'
$env:QA_PERF_WRITE='YES'
$env:QA_DEST_ACCOUNT_ID=Read-Host 'UUID de cuenta destino sintética de QA'
$env:QA_RUN_ID=(Get-Date -Format yyyyMMddHHmmss)
$env:QA_MODE='load'
k6 run --summary-export reports/qa-evidence/transfer-load.json tests/performance/transfers.js
$env:QA_RUN_ID=(Get-Date -Format yyyyMMddHHmmss)
$env:QA_MODE='stress'
k6 run --summary-export reports/qa-evidence/transfer-stress.json tests/performance/transfers.js
$env:QA_RUN_ID=(Get-Date -Format yyyyMMddHHmmss)
$env:QA_MODE='spike'
k6 run --summary-export reports/qa-evidence/transfer-spike.json tests/performance/transfers.js
```

**No repetir estos comandos en una BD compartida o con dinero real.** Cada solicitud crea una
transferencia de Q0.01; tras cada corrida validar saldo de origen/destino, conteos, auditoría,
colas, uso de CPU/RAM y ausencia de operaciones duplicadas. Los resultados pueden mostrar
fallos reales bajo aislamiento `Serializable`; no alterar umbrales retroactivamente.

## J. Seguridad, accesibilidad y gates — ejecución guiada

1. **npm audit:** usar `Ejecutar-QA.ps1 -Tipo audit-backend` y `audit-frontend`.
   El código de salida distinto de cero debe registrarse como hallazgo, no ocultarse.
2. **Dependency-Check:** solicitar al responsable DevSecOps un CLI/imagen o plugin Jenkins
   instalado y feed de vulnerabilidades actualizado. Escanear `backend/` y `frontend/`,
   generar HTML/JSON y archivar; el primer análisis de NVD puede tardar.
3. **SonarQube:** coordinar token/servidor Jenkins. Publicar cobertura `backend/coverage/lcov.info`,
   scanner sobre backend y frontend; habilitar `sonar.qualitygate.wait=true` y comprobar
   que un Quality Gate rojo impide el despliegue. Capturar dashboard del análisis.
4. **Fortify:** requiere CLI/servidor/licencia que provea el equipo. Configurar el scanner real
   según la versión instalada, producir el reporte autorizado; si no hay acceso, marcar BLOQUEADO.
5. **ZAP baseline:** solo contra QA local autorizado y con servidor corriendo. Desde PowerShell:

```powershell
New-Item -ItemType Directory -Force reports/qa-evidence/zap | Out-Null
docker run --rm -v "${PWD}/reports/qa-evidence/zap:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:5173 -r baseline.html -J baseline.json
```

   Para ZAP **full active scan**, obtener aprobación y usar únicamente ambiente QA aislado.
   Revisar `-n` contexto y `-U` usuario para probar rutas autenticadas; escanear solo login
   sin contexto no cubre transferencias ni endpoints protegidos.
6. **Accesibilidad:** ejecutar Lighthouse sobre login y páginas públicas; después automatizar
   rutas protegidas con sesión de QA (por ejemplo usando axe integrado a Cypress):

```powershell
npx --yes lighthouse http://127.0.0.1:5173/login --only-categories=accessibility --output=html --output-path=reports/qa-evidence/lighthouse-login.html
```

   Una puntuación no sustituye inspección de teclado, contraste, etiquetas y lectores de pantalla.
7. **Usabilidad:** **requiere cinco personas reales**. Automatizar captura y tabulación de
   formularios y tiempos, pero no reemplazar su participación por bots. Definir las tareas:
   iniciar sesión, encontrar saldo, buscar movimientos, registrar beneficiario y cerrar sesión.
   Recoger consentimiento y no registrar PII ni contraseñas.
8. **Jenkins:** verificar que los reportes se publican como artefactos; pruebas fallidas
   y hallazgos P0 deben terminar en build rojo, y los stages `Aprobación` / `Deploy final`
   deben ser omitidos. Forzar un test fallido **en QA**, confirmar bloqueo, restaurar código
   y ejecutar regresión. Mantener evidencias de ambas corridas.

## K. Simulaciones de fallos y observación

- **Redis:** primero prueba `redis.test.mjs` que valida 5 intentos, TTL e invalidación.
  La caída del servicio deberá ejecutarse de forma controlada sobre un contenedor exclusivo
  de QA, por ejemplo `docker stop securebank-redis` y comprobar HTTP temporal de login;
  luego `docker start securebank-redis` y verificar recuperación. Se debe automatizar esta
  secuencia al integrarla con Jenkins en un agente de QA aislado; **no** detener servicio compartido.
- **RabbitMQ:** el test `rabbitmq.test.mjs` publica mensaje malformado y espera DLQ; observar
  `securebank.events.queue`, `securebank.events.retry`, `securebank.events.dlq` desde el panel
  de administración `http://localhost:15672`, y registrar la ejecución del consumer.
- **Falla entre commit y mensaje:** en el código actual no existe outbox transaccional.
  Para demostrar que una operación no se pierde al fallar mensajería se necesita una
  prueba de caos y normalmente un cambio de diseño de backend. No afirmar garantía de entrega.

**Fuentes técnicas de referencia:**
- Cypress: https://docs.cypress.io/app/guides/screenshots-and-videos
- Insomnia CLI: https://developer.konghq.com/inso-cli/reference/run_collection/
- Maestro: https://docs.maestro.dev/maestro-flows/workspace-management/test-reports-and-artifacts
- k6: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- ZAP: https://www.zaproxy.org/docs/docker/
- Sonar: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui
