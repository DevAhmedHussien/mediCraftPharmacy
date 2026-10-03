-- The GoHighLevel contact this partner maps to.
--
-- Written once, on the first successful sync, so every later status change can
-- add and remove tags directly instead of searching the CRM by email. Nullable
-- because GHL is optional: a deployment without it leaves this null forever,
-- and a partner created while GHL was down gets it on their next transition.
ALTER TABLE "Partner" ADD COLUMN "ghlContactId" TEXT;
