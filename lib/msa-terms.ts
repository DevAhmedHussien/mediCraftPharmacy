/* ===========================================================================
   The blanks in the Master Service Agreement.

   The signed PDF (MSA v2026.1) ships with thirty-six INSERT fields. They are
   not drafting oversights — they are the operational and commercial terms the
   pharmacy fills in before the document goes out. Every one of them lives
   here, in one file, rather than scattered through the agreement prose, so
   filling them in is one edit and not a search-and-replace through a contract.

   NOTHING HERE IS INVENTED. Every value starts as `null`, and a null renders
   in the agreement as a visible blank — exactly as it appears in the PDF
   today. Guessing "30 days" for a notice period or "$1,000,000" for an
   insurance limit would put a number into a contract that nobody at MediCraft
   agreed to, and it would look authoritative while being fiction.

   `missingTerms()` reports what is still unset, and the admin partner screen
   shows that count before anyone sends an agreement.

   Section references are to the agreement body in lib/signature-text.ts.
   ========================================================================= */

/** A term that is either filled in or is honestly still a blank. */
export type Term = string | null;

export type MsaTerms = {
  /** §1.3 — daily cutoff for same-business-day processing, e.g. "2:00 PM ET". */
  orderCutoff: Term;
  /** §1.3 — days after onboarding during which the cutoff does not apply. */
  standardisationDays: Term;
  /** §1.5 — pharmacist line during business hours. */
  pharmacistPhone: Term;
  /** §1.5 — after-hours line for urgent clinical, quality or recall matters. */
  afterHoursPhone: Term;
  /** §2.3 — days to notify us of a credential lapse or adverse action. */
  credentialChangeNoticeDays: Term;
  /** §4.1 — days Exhibit A pricing is held from the Effective Date. */
  priceHoldDays: Term;
  /** §4.1 — written notice before any price increase takes effect. */
  priceIncreaseNoticeDays: Term;
  /** §4.4 — days past due before a late charge may accrue. */
  pastDueDays: Term;
  /** §4.4 — monthly late charge, e.g. "1.5%". */
  lateChargePercent: Term;
  /** §4.5 — days to raise a billing question. */
  billingQueryDays: Term;
  /** §5.1 — window to cancel a formulary item, e.g. "two hours". */
  formularyCancellationWindow: Term;
  /** §5.3 — where cancellation requests are sent. */
  cancellationChannel: Term;
  /** §6.1 — window to report a delivery problem, e.g. "48 hours". */
  claimWindow: Term;
  /** §6.1 — where delivery claims are reported. */
  claimChannel: Term;
  /** §8.1 — where adverse events and quality concerns are reported. */
  safetyReportChannel: Term;
  /** §8.1 — hours within which a serious adverse event must reach us. */
  seriousAdverseEventHours: Term;
  /** §9.3 — days to notify the other party of a PHI breach. */
  breachNoticeDays: Term;
  /** §10.5 — minimum record retention, in years. */
  recordRetentionYears: Term;
  /** §11 — years the confidentiality obligation survives termination. */
  confidentialitySurvivalYears: Term;
  /** §12 — insurance limit per claim, e.g. "$1,000,000". */
  insurancePerClaim: Term;
  /** §12 — insurance limit in the aggregate. */
  insuranceAggregate: Term;
  /** §12 — notice of cancellation or material reduction in coverage. */
  insuranceNoticeDays: Term;
  /** §14 — the floor on the liability cap, whichever is greater. */
  liabilityFloor: Term;
  /** §15.5 — months of inactivity before an account may be deactivated. */
  inactivityMonths: Term;
  /** §16.2 — notice before an operational change takes effect. */
  operationalChangeNoticeDays: Term;

  /**
   * §7 — the beyond-use dating table.
   *
   * Typical BUD and storage are stated in the agreement itself and are not
   * blanks; the two columns here are. Keyed by preparation type so a row can
   * be added without renumbering anything.
   */
  budTable: Record<BudRowKey, { suggestedMaxPerOrder: Term; minimumDatingOnArrival: Term }>;
};

export type BudRowKey =
  | "oralSolids"
  | "sublingualDrops"
  | "topicals"
  | "nasalSprays"
  | "sterileVials"
  | "commercial";

/** The typical BUD and storage for each row — stated in the PDF, not a blank. */
export const BUD_ROWS: { key: BudRowKey; label: string; typical: string }[] = [
  { key: "oralSolids", label: "Oral solids: capsules, troches, ODTs", typical: "180 days, room temperature" },
  { key: "sublingualDrops", label: "Sublingual drops", typical: "90 days, room temperature" },
  { key: "topicals", label: "Topicals: creams, gels, foams, solutions", typical: "30 to 90 days, room temperature (product-specific)" },
  { key: "nasalSprays", label: "Nasal sprays", typical: "35 days, refrigerated" },
  { key: "sterileVials", label: "Sterile multi-dose vials (USP <797>)", typical: "60 days room temperature · 90 days refrigerated · 120 days frozen" },
  { key: "commercial", label: "Commercially manufactured products", typical: "Manufacturer expiration date" },
];

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  FILL THESE IN.  Every `null` prints as a blank line in the agreement a
 *  partner is asked to sign.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const MSA_TERMS: MsaTerms = {
  orderCutoff: null,
  standardisationDays: null,
  pharmacistPhone: null,
  afterHoursPhone: null,
  credentialChangeNoticeDays: null,
  priceHoldDays: null,
  priceIncreaseNoticeDays: null,
  pastDueDays: null,
  lateChargePercent: null,
  billingQueryDays: null,
  formularyCancellationWindow: null,
  cancellationChannel: null,
  claimWindow: null,
  claimChannel: null,
  safetyReportChannel: null,
  seriousAdverseEventHours: null,
  breachNoticeDays: null,
  recordRetentionYears: null,
  confidentialitySurvivalYears: null,
  insurancePerClaim: null,
  insuranceAggregate: null,
  insuranceNoticeDays: null,
  liabilityFloor: null,
  inactivityMonths: null,
  operationalChangeNoticeDays: null,

  budTable: {
    oralSolids: { suggestedMaxPerOrder: null, minimumDatingOnArrival: null },
    sublingualDrops: { suggestedMaxPerOrder: null, minimumDatingOnArrival: null },
    topicals: { suggestedMaxPerOrder: null, minimumDatingOnArrival: null },
    nasalSprays: { suggestedMaxPerOrder: null, minimumDatingOnArrival: null },
    sterileVials: { suggestedMaxPerOrder: null, minimumDatingOnArrival: null },
    // "n/a" in the PDF — a manufactured product has no per-order suggestion.
    commercial: { suggestedMaxPerOrder: "n/a", minimumDatingOnArrival: null },
  },
};

/** How an unfilled term prints. Deliberately impossible to mistake for a value. */
export const BLANK = "[ ______________ ]";

export const term = (value: Term): string => value ?? BLANK;

/**
 * Which terms are still blank.
 *
 * Surfaced to an admin before they send an agreement. Not a hard block: the
 * source PDF carries these as fields filled at signing time, and several are
 * negotiated per deal — but nobody should send one by accident.
 */
export function missingTerms(terms: MsaTerms = MSA_TERMS): string[] {
  const missing: string[] = [];

  for (const [key, value] of Object.entries(terms)) {
    if (key === "budTable") continue;
    if (value === null) missing.push(key);
  }

  for (const row of BUD_ROWS) {
    const cells = terms.budTable[row.key];
    if (cells.suggestedMaxPerOrder === null) missing.push(`budTable.${row.key}.suggestedMaxPerOrder`);
    if (cells.minimumDatingOnArrival === null) missing.push(`budTable.${row.key}.minimumDatingOnArrival`);
  }

  return missing;
}
