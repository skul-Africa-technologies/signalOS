ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "squadReference" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "channel" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_squadReference_key" ON "transactions"("squadReference");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");
