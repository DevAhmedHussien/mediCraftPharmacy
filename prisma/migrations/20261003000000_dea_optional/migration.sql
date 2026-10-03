-- DEA registration becomes optional on a prescriber.
--
-- Not every prescriber named on a practice's account holds one: a mid-level
-- who only prescribes non-controlled preparations has no number to give, and
-- a NOT NULL column meant those accounts could not finish onboarding at all.
--
-- Dropping NOT NULL is the whole change. Nothing is backfilled and nothing is
-- lost — every existing row already carries a number, and the checksum check
-- in lib/schemas/account-details.ts still rejects a wrong one. Only an absent
-- one is now allowed through.
ALTER TABLE "Prescriber" ALTER COLUMN "deaCiphertext" DROP NOT NULL;
ALTER TABLE "Prescriber" ALTER COLUMN "deaLast4" DROP NOT NULL;
