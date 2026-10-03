-- The pipeline gains a documents stage, and PartnerApplication becomes a lead
-- record first and an application second.
--
-- WHY accountType BECOMES NULLABLE
-- --------------------------------
-- The public form no longer asks for it. A practice enquiring about pricing
-- has no view yet on whether they are opening a new account or linking an
-- existing one; that question belongs in the portal, after they have seen the
-- formulary. Defaulting it to NEW would have stored a guess as an answer.

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'GOVERNMENT_ID';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENTS_SUBMITTED';

-- AlterEnum
ALTER TYPE "PartnerStatus" ADD VALUE 'DOCUMENTS_PENDING';

-- AlterTable
ALTER TABLE "PartnerApplication" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "contactRole" TEXT,
ADD COLUMN     "interestNotes" TEXT,
ADD COLUMN     "medicationsOfInterest" TEXT,
ADD COLUMN     "orgType" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "accountType" DROP NOT NULL;

-- Applications that predate the split were all completed in one sitting on the
-- public form, so their lead date and their completion date are the same.
UPDATE "PartnerApplication" SET "completedAt" = "submittedAt" WHERE "completedAt" IS NULL;
