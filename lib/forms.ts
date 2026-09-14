/* ===========================================================================
   Form constants and the shared action/component contract.

   This module is imported by client components, so it must stay free of zod —
   and of anything else heavy. The validation schemas live next door in
   lib/forms.schema.ts and are imported only by the server actions.

   That split is not organisational tidiness. When the schemas lived here, every
   page carrying a form pulled zod into its client bundle just to read
   `initialFormState` or `US_STATES` from the same file: /contact went from
   152 kB to 179 kB of first-load JS, /providers from 162 kB to 188 kB, for a
   library that only ever executes on the server. Keep this file zod-free.
   ========================================================================= */

/** Shared shape returned by every server action to its form. */
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export const initialFormState: FormState = { ok: false };

/* --- Option lists --------------------------------------------------------
   Rendered as <option>s by the fields and re-validated against the schemas on
   the server. */

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

export const PROVIDER_ROLES = [
  "Owner",
  "Owner/Prescriber",
  "CEO",
  "COO",
  "General Manager",
  "Pharmacy Liaison",
  "Prescription Order Management",
  "Accounts Payable",
  "Other",
];

export const ORG_TYPES = [
  "We see patients in Office only",
  "We see patients in Office and/or via telehealth",
  "We use a 3rd party telehealth provider network",
  "We're a pharmacy looking for central fill",
];

export const REFERRAL_SOURCES = ["Google", "Referral", "Trade Show", "Other"];

/** Resume upload limits — stated to the applicant in the field's own label. */
export const RESUME_MAX_BYTES = 25 * 1024 * 1024;
export const RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
