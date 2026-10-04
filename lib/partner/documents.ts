import type { DocumentType } from "@prisma/client";

/* ===========================================================================
   Which documents a partner has to produce, and what each one is for.

   Kept out of the React components so the applicant's checklist, the server
   side gate that decides whether they may submit, and the admin's review panel
   all read from the same list. A required-document rule that lives in a
   component is a rule the server does not enforce.
   ========================================================================= */

export type DocumentSpec = {
  type: DocumentType;
  label: string;
  /** What we actually want to see, in the applicant's terms. */
  blurb: string;
  required: boolean;
};

/* ONE DOCUMENT.
 *
 * This list held eight: photo ID, DEA registration, state medical licence,
 * W-9, pharmacy licence, certificate of insurance, business registration and
 * a catch-all. Four of them were required, so an applicant could not finish
 * onboarding without producing all four — and every one was a scan a
 * practice manager had to find, photograph and upload before the account
 * would move.
 *
 * The pharmacy decided it only needs to know who is signing. That is the
 * photo ID, which is already collected at the identity step, long before
 * this one.
 *
 * The REMOVED TYPES ARE STILL IN THE DocumentType ENUM, deliberately. They
 * are not dropped from the database, because partners who already uploaded a
 * DEA certificate still have that row and the admin's review panel still has
 * to render it — it falls back to the raw type name when `specFor` returns
 * undefined. Deleting the enum members would orphan real uploads to prove a
 * tidiness point.
 */
export const DOCUMENT_SPECS: DocumentSpec[] = [
  {
    type: "GOVERNMENT_ID",
    label: "Photo ID",
    blurb:
      "A driver's licence or passport for your authorised signer. We check the name against the agreement before it goes out.",
    required: true,
  },
];

export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = DOCUMENT_SPECS.filter(
  (spec) => spec.required
).map((spec) => spec.type);

export function specFor(type: DocumentType): DocumentSpec | undefined {
  return DOCUMENT_SPECS.find((spec) => spec.type === type);
}

/**
 * Which required documents are still missing.
 *
 * A REJECTED upload does not count as present: a reviewer who rejected a
 * blurry licence needs the applicant to be blocked until a legible one lands,
 * not to see the slot as filled.
 */
export function missingRequired(
  uploaded: { type: DocumentType; status: string }[]
): DocumentType[] {
  const usable = new Set(
    uploaded.filter((doc) => doc.status !== "REJECTED").map((doc) => doc.type)
  );
  return REQUIRED_DOCUMENT_TYPES.filter((type) => !usable.has(type));
}
