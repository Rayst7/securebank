# Documentación Persona 1 — Backend SecureBank

Este documento recopila las revisiones y decisiones técnicas de la Persona 1
(lógica bancaria, PostgreSQL/Prisma, transferencias, pagos, idempotencia,
concurrencia y pruebas). No sustituye al README principal.

---

## Migración `20261017120000_add_payment_idempotency` — Revisión técnica

**Fecha de revisión:** 2026-10-17
**Fecha de aplicación:** 2026-10-18
**Revisor:** Persona 1 (Backend)
**Estado:** Revisada y **APLICADA** con `npx prisma migrate deploy` en el entorno
local de desarrollo (ver sección 10).

### 1. Objetivo de la migración

Habilitar la idempotencia de pagos incorporando una clave de idempotencia al
modelo `Payment`, con una restricción única compuesta por `(account_id,
idempotency_key)` — mismo patrón que ya utiliza `Transfer`.

### 2. Archivos revisados

| Archivo | Qué se verificó |
|---|---|
| `prisma/migrations/20261017120000_add_payment_idempotency/migration.sql` | DDL de la migración |
| `prisma/schema.prisma` (modelo `Payment`, líneas 135-157) | Coincidencia esquema ↔ migración |
| `prisma/migrations/migration_lock.toml` | Provider `postgresql` |
| `prisma7.config.ts` / `prisma.config.ts` | Configuración de Prisma 7 |
| BD `securebank` (PostgreSQL 16.15) | Estado actual (solo lectura) |

### 3. Comprobaciones realizadas y resultados

| # | Comprobación | Resultado |
|---|---|---|
| 1 | ¿Agrega `idempotency_key` a `payments`? | ✅ `ALTER TABLE "payments" ADD COLUMN "idempotency_key" VARCHAR(255)` |
| 2 | ¿Conserva los registros existentes? | ✅ No hay `DROP`, `DELETE` ni `TRUNCATE` |
| 3 | ¿Asigna clave a los pagos existentes antes de `NOT NULL`? | ✅ `UPDATE ... SET idempotency_key = id::text WHERE ... IS NULL` precede al `SET NOT NULL` |
| 4 | ¿Crea la restricción única compuesta? | ✅ `CREATE UNIQUE INDEX "payments_account_id_idempotency_key_key" ON "payments"("account_id","idempotency_key")` — nombre idéntico al que genera Prisma para `@@unique([accountId, idempotencyKey])` |
| 5 | ¿Modifica montos, saldos u otros datos bancarios? | ✅ No. Solo agrega una columna no monetaria y rellena esa columna nueva |
| 6 | ¿Coincide con `schema.prisma`? | ✅ `String @map("idempotency_key") @db.VarChar(255)` (NOT NULL) + `@@unique([accountId, idempotencyKey])` |
| 7 | ¿Compatibilidad con la BD? | ✅ PostgreSQL 16.15 soporta todas las sentencias |
| 8 | ¿Compatibilidad con Prisma 7? | ✅ `migration_lock.toml` = `postgresql`; migración SQL estándar; `prisma migrate status` la reconoce como pendiente |
| 9 | ¿Conflicto de nombres de índice? | ✅ No existe `payments_account_id_idempotency_key_key` en la BD |

### 4. Estado de la base de datos previo a la aplicación (solo lectura)

- **PostgreSQL:** 16.15.
- **Columna `idempotency_key` en `payments`:** **no existía** (migración no aplicada).
- **Registros en `payments`:** 1 (estado `COMPLETED`). El backfill tomaría su `id` como clave.
- **Índices actuales en `payments`:** `payments_pkey`, `payments_reference_key`,
  `payments_account_id_created_at_idx`, `payments_status_idx`.
- **Migraciones aplicadas:** `20261015013542_init_banking_schema`.
- **Migraciones pendientes:** `20261017120000_add_payment_idempotency`.

### 5. Riesgos identificados

1. **Bloqueo breve de la tabla:** `CREATE UNIQUE INDEX` (sin `CONCURRENTLY`) toma un
   lock de escritura. Con 1 fila el impacto es despreciable; en tablas grandes se
   consideraría `CONCURRENTLY` (no permitido dentro de la transacción de migración de Prisma).
2. **Backfill con `id::text`:** válido y único (UUID de 36 caracteres ≤ 255). No colisiona
   con claves futuras de clientes salvo coincidencia exacta con un UUID de pago, improbable.
3. **Migración no re-ejecutable manualmente:** al no ser idempotente (`ADD COLUMN` fallaría
   si la columna ya existe). Prisma la rastrea en `_prisma_migrations`, por lo que no se
   re-ejecuta.
4. **Cambio de contrato:** `POST /api/payments` ahora exige `idempotencyKey`; clientes que no
   lo envíen reciben `400`. Debe comunicarse al equipo de frontend.
5. **Garantía de concurrencia:** la unicidad está razonada y respaldada por el índice, pero
   **no se ha verificado con concurrencia real** (solo pruebas unitarias con mocks).

Ninguno de estos riesgos impide aplicar la migración en el entorno de desarrollo actual.

### 6. Comandos utilizados en la revisión (solo lectura)

```bash
# Estado de migraciones (no modifica la BD)
npx prisma migrate status

# Inspección de columnas e índices (solo lectura)
docker exec securebank-postgres psql -U securebank -d securebank -tAc \
  "SELECT column_name FROM information_schema.columns WHERE table_name='payments';"
docker exec securebank-postgres psql -U securebank -d securebank -tAc \
  "SELECT indexname FROM pg_indexes WHERE tablename='payments';"
```

### 7. Comando recomendado para aplicar la migración

> Ejecutar **solo con autorización explícita**.

```bash
npx prisma migrate deploy    # aplica migraciones pendientes sin reset ni borrado
```

Verificación posterior (solo lectura):

```bash
npx prisma migrate status
npx prisma generate          # regenerar el cliente si fuese necesario
```

`prisma migrate deploy` es preferible a `prisma migrate dev` porque no intenta
detectar drift ni puede provocar un reset.

### 8. Limitaciones y pendientes

- Migración **aplicada** el 2026-10-18 (ver sección 10).
- **Concurrencia real no comprobada:** solo existen pruebas unitarias con mocks; falta una
  prueba de integración contra PostgreSQL/RabbitMQ (Tarea C). Las pruebas unitarias con
  mocks **no demuestran** la concurrencia real.
- Sin procesamiento específico de eventos en el consumer; `TRANSFER_REJECTED` y
  `FRAUD_ALERT` siguen sin reglas de negocio definidas.
- Sin outbox: persiste la brecha de fiabilidad entre el commit de PostgreSQL y RabbitMQ.

### 9. Confirmación

Durante la revisión **previa** (sección 3-7) no se ejecutó `prisma migrate deploy`,
`prisma migrate dev` ni ninguna sentencia que modifique la base de datos.
El 2026-10-18 se ejecutó únicamente `npx prisma migrate deploy` (autorizado, ver
sección 10). No se borraron ni alteraron registros, no se modificaron montos ni saldos
y no se reinició la base de datos.

---

### 10. Resultado de la aplicación — Tarea D (2026-10-18)

**Entorno verificado previamente:** backend en `backend/`; `DATABASE_URL` apunta a la
BD local de desarrollo (`postgresql://...@localhost:5433/securebank`), contenedor Docker
`securebank-postgres` healthy; `prisma migrate status` reportaba exactamente una
migración pendiente (`20261017120000_add_payment_idempotency`), sin migraciones
inesperadas.

| # | Comando (ejecutado en `backend/`) | Resultado real |
|---|---|---|
| 1 | `npx prisma migrate deploy` | ✅ Exitoso — se aplicó `20261017120000_add_payment_idempotency`; "All migrations have been successfully applied." |
| 2 | `npx prisma migrate status` | ✅ Exitoso — 2 migraciones encontradas; "Database schema is up to date!" (0 pendientes) |
| 3 | `\d payments` + conteos (psql, solo lectura) | ✅ Columna `idempotency_key character varying(255) NOT NULL` presente; índice `payments_account_id_idempotency_key_key` UNIQUE; 1 pago total, backfill = 1 (`idempotency_key = id::text`), 0 nulas |
| 4 | `npm run build` | ✅ Exitoso (código de salida 0, `nest build` sin errores) |
| 5 | `npm test` | ✅ Exitoso — 4 suites, **36/36 pruebas pasaron** (4.236 s). El `SyntaxError` visible en la salida es un escenario esperado de la prueba de DLQ en `rabbitmq.consumer.spec.ts` |
| 6 | `npm run lint` | ✅ Exitoso (código de salida 0) — 2 advertencias preexistentes e impresas ajenas a la Tarea D: import sin usar `BANKING_EVENTS` en `src/rabbitmq/rabbitmq.service.ts:13` y `ServiceUnavailableException` en `src/transfers/transfers.service.ts:7` |

**Salvedad sobre concurrencia:** estas verificaciones confirman que la migración está
aplicada y que compilación, pruebas y lint pasan. **No** demuestran que la concurrencia
real esté comprobada: las pruebas de idempotencia son unitarias con mocks sobre
Prisma/Repositorio. La verificación de concurrencia real contra PostgreSQL continúa
pendiente (Tarea C, pruebas de integración).
