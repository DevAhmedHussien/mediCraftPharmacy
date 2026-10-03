-- NotificationType gains MEETING_REQUESTED.
--
-- Caught at runtime, not by a test: the parity suite compared PartnerStatus
-- and Permission against Prisma but not NotificationType, so adding a member
-- to the TypeScript union alone type-checked and then threw
-- PrismaClientValidationError inside the transition transaction. The parity
-- test now covers all three enums.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MEETING_REQUESTED';

