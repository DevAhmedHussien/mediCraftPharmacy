-- Nobody sees Provider Cost until we know who is asking.
--
-- MSA §11 makes the Partner Formulary's pricing confidential, and the public
-- enquiry form is fourteen fields anyone can fill in. Between signing in and
-- seeing the formulary, the requester now names themselves, gives a direct
-- line, and uploads a government photo ID for a reviewer to match.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'IDENTITY_SUBMITTED';

-- AlterEnum
ALTER TYPE "PartnerStatus" ADD VALUE 'IDENTITY_SUBMITTED';

-- AlterTable
ALTER TABLE "PartnerApplication" ADD COLUMN     "identitySubmittedAt" TIMESTAMP(3),
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "identityVerifiedById" TEXT,
ADD COLUMN     "requesterEmail" TEXT,
ADD COLUMN     "requesterName" TEXT,
ADD COLUMN     "requesterNote" TEXT,
ADD COLUMN     "requesterPhone" TEXT,
ADD COLUMN     "requesterTitle" TEXT;

