-- The pricing call becomes a two-sided booking.
--
-- Before this, an admin typed one time and the applicant was told what it
-- was. The applicant had no way to say "I am in clinic then" short of
-- replying to the email, which nothing in the system reads — so the call was
-- rearranged over the phone and the record here went stale immediately.
--
-- Now the admin offers times and the applicant picks one. `confirmedAt` is
-- what separates a time they chose from a time that was chosen for them, and
-- `conferenceUrl` holds the Google Meet link minted when the pick lands.
--
-- Additive only. Existing rows keep their `scheduledAt` and read as
-- admin-booked, which is what they were.
ALTER TABLE "Meeting"
  ADD COLUMN "proposedSlots"   TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[],
  ADD COLUMN "slotsOfferedAt"  TIMESTAMP(3),
  ADD COLUMN "confirmedAt"     TIMESTAMP(3),
  ADD COLUMN "partnerNote"     TEXT,
  ADD COLUMN "conferenceUrl"   TEXT,
  ADD COLUMN "calendarEventId" TEXT;
