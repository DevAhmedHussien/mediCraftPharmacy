-- Amendment negotiation: a change order negotiates like the first application.
--
-- A verified partner adding medications gets the same pricing conversation they
-- had the first time — accept, ask for another round, or ask for a call — but
-- without re-submitting identity, documents or account details, which we
-- already hold. Those two new stops are the call.
--
-- NOTE ON `Meeting."proposedSlots"`:
--   `prisma migrate diff` also wants to DROP its DEFAULT, and that is
--   deliberately NOT done here. The default (`ARRAY[]::TIMESTAMP(3)[]`) was
--   added in 20261003010000_meeting_slot_offers precisely so a NOT NULL array
--   column could be added to rows that already existed. The Prisma schema does
--   not declare it because the client always supplies the field, but the
--   database still needs it: dropping it makes any INSERT that omits the column
--   fail the NOT NULL constraint. The drift is intentional and benign.

-- Postgres will not let a value added to an enum be used in the same
-- transaction that adds it, so these run on their own.
ALTER TYPE "AmendmentStatus" ADD VALUE IF NOT EXISTS 'MEETING_REQUESTED';
ALTER TYPE "AmendmentStatus" ADD VALUE IF NOT EXISTS 'MEETING_SCHEDULED';

-- What the partner said when asking for another round or a call. `adminNote`
-- is the pharmacy's half of the same conversation; keeping them apart means
-- neither overwrites the other.
ALTER TABLE "FormularyAmendment" ADD COLUMN IF NOT EXISTS "partnerNote" TEXT;

-- A meeting can now be about a change order rather than the first application.
-- Null on every row that already exists, which is exactly what those are.
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "amendmentId" TEXT;

CREATE INDEX IF NOT EXISTS "Meeting_amendmentId_idx" ON "Meeting"("amendmentId");

ALTER TABLE "Meeting"
  ADD CONSTRAINT "Meeting_amendmentId_fkey"
  FOREIGN KEY ("amendmentId") REFERENCES "FormularyAmendment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
