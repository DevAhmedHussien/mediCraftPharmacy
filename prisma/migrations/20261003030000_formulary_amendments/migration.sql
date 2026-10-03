-- Verified partners can ask to add preparations.
--
-- The agreement says no pricing change takes effect without a signed change
-- order, so a request is priced, accepted and signed like the original
-- schedule was. It reuses PriceListVersion rather than introducing a second
-- pricing system: an amendment's prices are simply the next version.
--
-- The lifecycle is deliberately NOT PartnerStatus. A verified partner asking
-- for three more preparations is still verified and still ordering everything
-- already on their schedule; routing this through the partner status would
-- knock them back to the pricing stage and stop those orders.
CREATE TYPE "AmendmentStatus" AS ENUM (
  'REQUESTED',
  'UNDER_REVIEW',
  'PRICING_SENT',
  'CHANGES_REQUESTED',
  'ACCEPTED',
  'CHANGE_ORDER_SENT',
  'SIGNED',
  'DECLINED'
);

CREATE TABLE "FormularyAmendment" (
  "id"                 TEXT NOT NULL,
  "partnerId"          TEXT NOT NULL,
  "number"             INTEGER NOT NULL,
  "status"             "AmendmentStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestNotes"       TEXT NOT NULL,
  "requestedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById"       TEXT,
  "reviewedAt"         TIMESTAMP(3),
  "adminNote"          TEXT,
  "priceListVersionId" TEXT,
  "msaEnvelopeId"      TEXT,
  "signedAt"           TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormularyAmendment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AmendmentItem" (
  "id"          TEXT NOT NULL,
  "amendmentId" TEXT NOT NULL,
  "productId"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AmendmentItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormularyAmendment_partnerId_number_key"
  ON "FormularyAmendment"("partnerId", "number");
CREATE INDEX "FormularyAmendment_partnerId_status_idx"
  ON "FormularyAmendment"("partnerId", "status");
CREATE INDEX "FormularyAmendment_status_requestedAt_idx"
  ON "FormularyAmendment"("status", "requestedAt");

CREATE UNIQUE INDEX "AmendmentItem_amendmentId_productId_key"
  ON "AmendmentItem"("amendmentId", "productId");
CREATE INDEX "AmendmentItem_amendmentId_idx" ON "AmendmentItem"("amendmentId");

ALTER TABLE "FormularyAmendment"
  ADD CONSTRAINT "FormularyAmendment_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormularyAmendment"
  ADD CONSTRAINT "FormularyAmendment_priceListVersionId_fkey"
  FOREIGN KEY ("priceListVersionId") REFERENCES "PriceListVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormularyAmendment"
  ADD CONSTRAINT "FormularyAmendment_msaEnvelopeId_fkey"
  FOREIGN KEY ("msaEnvelopeId") REFERENCES "MsaEnvelope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AmendmentItem"
  ADD CONSTRAINT "AmendmentItem_amendmentId_fkey"
  FOREIGN KEY ("amendmentId") REFERENCES "FormularyAmendment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AmendmentItem"
  ADD CONSTRAINT "AmendmentItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
