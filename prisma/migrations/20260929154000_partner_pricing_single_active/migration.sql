-- A partner may hold at most one ACTIVE price per product. Prisma cannot
-- express a partial unique index, so it is declared here by hand. Without it,
-- a retried "activate pricing" on verification can leave two active rows for
-- the same product and the price a partner is charged becomes whichever the
-- query planner returns first.
CREATE UNIQUE INDEX "PartnerPricing_partnerId_productId_active_key"
  ON "PartnerPricing" ("partnerId", "productId")
  WHERE "isActive";

-- (No DESC index on DailyStat: the @@index([date]) in the schema already
-- serves "newest first" — Postgres scans a btree backwards at the same cost —
-- and an index Prisma cannot see in the schema is reported as drift on every
-- subsequent `migrate dev`.)

-- Case-insensitive email lookup for login, without a functional scan.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (LOWER("email"));
