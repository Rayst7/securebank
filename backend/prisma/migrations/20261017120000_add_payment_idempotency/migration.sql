-- AlterTable: add idempotency key column (nullable initially to allow backfill).
ALTER TABLE "payments" ADD COLUMN "idempotency_key" VARCHAR(255);

-- Backfill: assign the row primary key as its idempotency key for pre-existing payments.
-- Existing rows were created before idempotency existed, so the generated key is unique
-- (the payment UUID) and no longer semantically relevant.
UPDATE "payments" SET "idempotency_key" = "id"::text WHERE "idempotency_key" IS NULL;

-- Enforce the required constraint now that every row has a key.
ALTER TABLE "payments" ALTER COLUMN "idempotency_key" SET NOT NULL;

-- CreateIndex: composite unique key enabling idempotent payment creation per account.
CREATE UNIQUE INDEX "payments_account_id_idempotency_key_key" ON "payments"("account_id", "idempotency_key");
