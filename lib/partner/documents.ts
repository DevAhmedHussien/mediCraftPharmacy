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

export const DOCUMENT_SPECS: DocumentSpec[] = [
  {
    type: "GOVERNMENT_ID",
    label: "Photo ID",
    blurb:
      "A driver's licence or passport for your authorised signer. We check the name against the agreement before it goes out.",
    required: true,
  },
  {
    type: "DEA_REGISTRATION",
    label: "DEA registration",
    blurb: "The certificate for each prescriber listed on your account.",
    required: true,
  },
  {
    type: "STATE_LICENSE",
    label: "State medical licence",
    blurb: "Current licence for the prescriber, issued by the state you practise in.",
    required: true,
  },
  {
    type: "W9",
    label: "W-9",
    blurb: "Signed, with the legal business name and EIN you gave us on the previous step.",
    required: true,
  },
  {
    type: "PHARMACY_LICENSE",
    label: "Pharmacy licence",
    blurb: "If you hold one. Not every practice does.",
    required: false,
  },
  {
    type: "CERTIFICATE_OF_INSURANCE",
    label: "Certificate of insurance",
    blurb: "Professional liability, if your agreement will require it.",
    required: false,
  },
  {
    type: "BUSINESS_REGISTRATION",
    label: "Business registration",
    blurb: "Articles of incorporation or equivalent, if your entity is newly formed.",
    required: false,
  },
  {
    type: "OTHER",
    label: "Anything else",
    blurb: "Anything a reviewer asked you for that does not fit above.",
    required: false,
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
