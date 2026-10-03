import { agreementText, hashAgreement } from "@/lib/signature-text";
import { BLANK, BUD_ROWS, MSA_TERMS, missingTerms, type MsaTerms } from "@/lib/msa-terms";

/* ===========================================================================
   The Master Service Agreement.

   This is the one piece of text in the codebase with legal effect, so it gets
   a test that is about the text and not about the code around it: every
   section of MSA v2026.1 is present, nothing has been quietly added, and an
   unfilled commercial term is impossible to mistake for a filled one.

   The hash assertions are the reason the rest matters. A signature stores the
   fingerprint of the exact words that were on screen, so an edit to this
   document must change that fingerprint — otherwise a later edit would
   silently claim to have been signed.
   ========================================================================= */

let pass = 0;
const fails: string[] = [];
const check = (label: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`    ✓ ${label}`); }
  else { fails.push(label); console.log(`    ✗ ${label}  ${detail}`); }
};

const text = agreementText("Coastal Primary Care");

/* Clause checks run against flattened whitespace, for the same reason
   `hashAgreement` normalises it: where a sentence happens to wrap is a
   rendering detail, and a test that fails when a line breaks differently is a
   test about line breaks. */
const flat = (value: string) => value.replace(/\s+/g, " ").trim();
const flatText = flat(text);

console.log("\n  MSA v2026.1\n");

/* --- It is the real document -------------------------------------------- */

check("it is MSA v2026.1, not a placeholder", text.includes("MSA v2026.1"));
check(
  "no draft or placeholder language survives",
  !/PLACEHOLDER|not been reviewed by counsel|— DRAFT/i.test(text),
  text.slice(0, 80)
);
check("the pharmacy is the real legal entity", text.includes("MediCraft Precision LLC, d/b/a MediCraft Pharmacy"));
check("the client name is interpolated", text.includes("Coastal Primary Care"));

const SECTIONS = [
  "1. WHAT MEDICRAFT WILL DO",
  "2. WHAT CLIENT WILL DO",
  "3. PRESCRIPTIONS WE CANNOT FILL",
  "4. PRICING, INVOICING, AND PAYMENT",
  "5. CANCELLATIONS",
  "6. SHIPPING, DELIVERY, AND RESHIPMENT",
  "7. BEYOND-USE DATING AND STORAGE",
  "8. SAFETY, COMPLAINTS, AND RECALLS",
  "9. PRIVACY AND DATA",
  "10. COMPLIANCE AND FAIR DEALING",
  "11. CONFIDENTIALITY",
  "12. INSURANCE",
  "13. MUTUAL INDEMNIFICATION",
  "14. LIMITATION OF LIABILITY",
  "15. TERM, SUSPENSION, AND TERMINATION",
  "16. GENERAL",
];
const missingSections = SECTIONS.filter((heading) => !flatText.includes(heading));
check("all sixteen sections present", missingSections.length === 0, missingSections.join(", "));

/* Clauses that carry real obligations. If a future edit drops one of these,
   the agreement has changed in substance, not in formatting. */
const CLAUSES: [string, string][] = [
  ["503A compounding is stated", "section 503A of the Federal Food, Drug, and Cosmetic Act"],
  ["USP standards are named", "USP <795>, <797>, and <800>"],
  ["self-pay only", "not covered by, and will not be submitted to, Medicare"],
  ["no office stock", "You will not use it as office stock"],
  ["anti-kickback compliance", "federal Anti-Kickback Statute"],
  ["one-year auto-renewing term", "continues for one year, then renews automatically"],
  ["thirty days to terminate", "terminate on thirty days' written notice"],
  ["no minimum, no exclusivity, no termination fee", "no minimum order commitment, no exclusivity, and no termination fee"],
  ["Florida law governs", "Florida law governs"],
  ["Pinellas County venue", "Pinellas County"],
  ["order of precedence", "a signed amendment controls"],
  ["card details never reach us", "we do not receive or store full account numbers"],
];
for (const [label, needle] of CLAUSES) {
  check(label, flatText.includes(flat(needle)), needle.slice(0, 50));
}

/* --- Blanks are blanks --------------------------------------------------- */

const blanksInText = text.split(BLANK).length - 1;
const stillMissing = missingTerms();

check(
  "every unfilled term prints as a visible blank",
  blanksInText === stillMissing.length,
  `${blanksInText} blanks rendered, ${stillMissing.length} terms unset`
);
check(
  "a blank cannot be mistaken for a value",
  !/\b(30|60|90|1,000,000)\b days/.test(BLANK) && BLANK.includes("____")
);
check(
  "the BUD table lists every preparation type",
  BUD_ROWS.every((row) => flatText.includes(flat(row.label))),
  BUD_ROWS.map((r) => r.label).find((l) => !flatText.includes(flat(l))) ?? ""
);
check(
  "each BUD row states its typical dating from the document",
  BUD_ROWS.every((row) => flatText.includes(flat(row.typical)))
);

/* Filling a term must actually change the document. */
const filled: MsaTerms = {
  ...MSA_TERMS,
  orderCutoff: "2:00 PM ET",
  budTable: { ...MSA_TERMS.budTable },
};
const filledText = agreementText("Coastal Primary Care", filled);
check("filling a term reaches the agreement", filledText.includes("2:00 PM ET"));
check("and removes exactly one blank", filledText.split(BLANK).length === blanksInText);

/* --- The fingerprint ----------------------------------------------------- */

check("the same text hashes the same", hashAgreement(text) === hashAgreement(text));
check(
  "reflowing whitespace does not invalidate a signature",
  hashAgreement(text) === hashAgreement(text.replace(/\n/g, "\n  "))
);
check(
  "changing a word does",
  hashAgreement(text) !== hashAgreement(text.replace("Florida law governs", "Texas law governs"))
);
check(
  "filling in a commercial term does",
  hashAgreement(text) !== hashAgreement(filledText)
);
check(
  "a different client is a different agreement",
  hashAgreement(text) !== hashAgreement(agreementText("Bayside Endocrinology"))
);

console.log(`\n  msa: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) process.exit(1);
