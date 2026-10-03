-- Pending CRM mirrors, enqueued atomically with the status change that
-- caused them, so no GoHighLevel round trip sits on a request path.
-- CreateTable
CREATE TABLE "CrmOutbox" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "toStatus" "PartnerStatus" NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmOutbox_idempotencyKey_key" ON "CrmOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CrmOutbox_status_nextAttemptAt_idx" ON "CrmOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "CrmOutbox_partnerId_idx" ON "CrmOutbox"("partnerId");

-- AddForeignKey
ALTER TABLE "CrmOutbox" ADD CONSTRAINT "CrmOutbox_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

