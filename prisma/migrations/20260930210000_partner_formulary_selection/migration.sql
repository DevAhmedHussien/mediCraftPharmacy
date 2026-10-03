-- The medications a partner actually dispenses.
--
-- The formulary is 692 items and no practice orders all of them. Picking a
-- working set before any negotiation is what makes the rest of the pipeline
-- sane: the call is about something specific, the price-list draft is a few
-- dozen lines rather than seven hundred, and the partner is not asked to read
-- a catalogue to find the eight products they buy.

-- CreateTable
CREATE TABLE "PartnerFormularySelection" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerFormularySelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerFormularySelection_partnerId_idx" ON "PartnerFormularySelection"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerFormularySelection_partnerId_productId_key" ON "PartnerFormularySelection"("partnerId", "productId");

-- AddForeignKey
ALTER TABLE "PartnerFormularySelection" ADD CONSTRAINT "PartnerFormularySelection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerFormularySelection" ADD CONSTRAINT "PartnerFormularySelection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

