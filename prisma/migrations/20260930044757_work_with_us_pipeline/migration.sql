-- Work With Us pipeline.
--
-- Generated with `prisma migrate diff` rather than `migrate dev`, which
-- refuses to run non-interactively when an enum loses values. The removed
-- PriceListStatus members (SUBMITTED, ADMIN_APPROVED, PARTNER_ACCEPTED) were
-- confirmed unused — PriceListVersion was empty — before this was applied.
--
-- PriceListItem swaps proposedPrice/approvedPrice for discountPercent and
-- finalPrice: a discount is what is actually negotiated ("15% off" is the
-- sentence said on the call), and finalPrice is stored rather than derived so
-- a later change to a product's list price cannot restate an agreement the
-- partner already accepted.

-- CreateEnum
CREATE TYPE "SignatureDriver" AS ENUM ('INTERNAL', 'DOCUSIGN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PartnerStatus" ADD VALUE 'MEETING_REQUESTED';
ALTER TYPE "PartnerStatus" ADD VALUE 'NEGOTIATED_PRICING_SENT';

-- AlterEnum
BEGIN;
CREATE TYPE "PriceListStatus_new" AS ENUM ('DRAFT', 'SENT', 'CHANGES_REQUESTED', 'ACCEPTED', 'SUPERSEDED');
ALTER TABLE "public"."PriceListVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PriceListVersion" ALTER COLUMN "status" TYPE "PriceListStatus_new" USING ("status"::text::"PriceListStatus_new");
ALTER TYPE "PriceListStatus" RENAME TO "PriceListStatus_old";
ALTER TYPE "PriceListStatus_new" RENAME TO "PriceListStatus";
DROP TYPE "public"."PriceListStatus_old";
ALTER TABLE "PriceListVersion" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "PriceListItem" DROP COLUMN "approvedPrice",
DROP COLUMN "proposedPrice",
ADD COLUMN     "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "finalPrice" DECIMAL(12,4) NOT NULL;

