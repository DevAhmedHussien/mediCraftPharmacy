-- Meeting request/scheduling and internal signature capture.
--
-- Meeting now carries both halves of the negotiation exchange: the
-- applicant's request with its required reasons, and the admin's scheduling.
-- `scheduledAt IS NULL` is the distinction the applicant's status page reads
-- to tell "we have your request" from "here is your time".
--
-- MsaEnvelope gains the internal signature driver's columns. `agreementHash`
-- is the SHA-256 of the exact text that was on screen when the name was
-- typed — without it, "they signed" cannot be tied to what they signed.

-- DropIndex
DROP INDEX "Meeting_partnerId_idx";

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "createdById",
DROP COLUMN "notes",
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "durationMinutes" INTEGER DEFAULT 30,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "requestNotes" TEXT NOT NULL,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "scheduledById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "MsaEnvelope" ADD COLUMN     "agreementHash" TEXT,
ADD COLUMN     "driver" "SignatureDriver" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "signedIp" TEXT,
ADD COLUMN     "signedName" TEXT,
ADD COLUMN     "signedUserAgent" TEXT;

-- CreateIndex
CREATE INDEX "Meeting_partnerId_requestedAt_idx" ON "Meeting"("partnerId", "requestedAt");

-- CreateIndex
CREATE INDEX "Meeting_scheduledAt_idx" ON "Meeting"("scheduledAt");

