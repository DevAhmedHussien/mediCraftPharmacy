-- Card on file, taken during onboarding and billed against the agreed schedule.
--
-- Every column is nullable and nothing is backfilled, so this applies to a
-- live table without a rewrite and without a lock worth worrying about.
-- Partners onboarded before today simply have no card recorded.
--
-- THERE IS DELIBERATELY NO CVV COLUMN. Card network rules prohibit retaining
-- the security code once a payment is authorised, and a processor that finds
-- stored CVVs can close the merchant account over it. The code is validated
-- when it is typed, used, and dropped.
--
-- The number follows the same shape as every other regulated identifier in
-- this schema: an AES-256-GCM envelope in `cardPanCiphertext`, plus the four
-- digits in `cardLast4` that let a screen say "Visa ending 4242" without a
-- decrypt call.
ALTER TABLE "PartnerOnboarding"
  ADD COLUMN "cardholderName"    TEXT,
  ADD COLUMN "cardBrand"         TEXT,
  ADD COLUMN "cardPanCiphertext" TEXT,
  ADD COLUMN "cardLast4"         TEXT,
  ADD COLUMN "cardExpMonth"      INTEGER,
  ADD COLUMN "cardExpYear"       INTEGER,
  ADD COLUMN "cardCapturedAt"    TIMESTAMP(3);

-- NOTE ON THE INQUIRY RENAME SHIPPED ALONGSIDE THIS.
-- `SiteEnquiry` and its two enum types were renamed in the Prisma schema to
-- `SiteInquiry` and mapped straight back with @@map. The application spelling
-- changed; the database objects did not, so there is intentionally no DDL
-- here for it. Renaming live tables and enum types to correct a letter would
-- have been a rewrite of every row for a vocabulary change.
