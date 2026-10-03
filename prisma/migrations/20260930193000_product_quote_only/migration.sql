-- Ten of the 692 formulary items are priced "Quote" rather than from the list.
-- MSA §4.1 puts those on a written quote or change order, so they are flagged
-- and excluded from an automatic price-list draft — carrying them at a
-- fictional $0.00 would put a zero in front of a partner as though it were a
-- price we had agreed to.
ALTER TABLE "Product" ADD COLUMN "isQuoteOnly" BOOLEAN NOT NULL DEFAULT false;
