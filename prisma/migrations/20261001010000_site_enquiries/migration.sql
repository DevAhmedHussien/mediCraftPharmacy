-- The public forms finally go somewhere.
--
-- Contact, refill and careers each ended in a console.log and a success
-- message. A patient asking for a refill was told it had been received when it
-- had not, and the refill log line wrote a named patient, their date of birth
-- and their medication into the host's plaintext logs.
--
-- Submissions are stored sealed; a refill is flagged as PHI and staff are
-- notified with a link and nothing else.

-- CreateEnum
CREATE TYPE "SiteEnquiryKind" AS ENUM ('CONTACT', 'REFILL', 'CAREER');

-- CreateEnum
CREATE TYPE "SiteEnquiryStatus" AS ENUM ('NEW', 'HANDLED', 'SPAM');

-- CreateTable
CREATE TABLE "SiteEnquiry" (
    "id" TEXT NOT NULL,
    "kind" "SiteEnquiryKind" NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "payloadCiphertext" TEXT NOT NULL,
    "isPhi" BOOLEAN NOT NULL DEFAULT false,
    "status" "SiteEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "handledAt" TIMESTAMP(3),
    "handledById" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteEnquiry_status_createdAt_idx" ON "SiteEnquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SiteEnquiry_kind_createdAt_idx" ON "SiteEnquiry"("kind", "createdAt");

