/** Shared shape returned by every server action to its form. */
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export const initialFormState: FormState = { ok: false };

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

/** Validate a batch of required fields; returns a field→message error map. */
export function requireFields(
  data: FormData,
  fields: { name: string; label: string }[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const value = (data.get(f.name) ?? "").toString().trim();
    if (!value) errors[f.name] = `${f.label} is required.`;
  }
  return errors;
}

export function isEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function isZip(value: string) {
  return ZIP_RE.test(value.trim());
}
