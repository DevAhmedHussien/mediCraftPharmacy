import { z } from "zod";

import { isValidDate, isValidDea, isValidNpi, isValidUsPhone, parseDate, parseUsPhone } from "@/lib/masks";

/* ===========================================================================
   MediCraft Pharmacy account details — the full application, as a schema.

   A translation of the supplied Account Setup JSON Schema, plus the trading
   details a pharmacy needs before it can invoice anyone, with the validation a
   JSON Schema cannot express bolted on: a DEA checksum, an NPI Luhn check,
   NANP phone rules, and real-calendar date checking.

   WHY THIS IS NOT THE PUBLIC FORM ANY MORE
   ----------------------------------------
   It was, and asking a stranger for two prescribers' DEA numbers before
   showing them a single price is why that form was abandoned two screens in.
   The public enquiry (lib/schemas/lead.ts) is now fourteen fields; this one is
   filled in from inside the portal, once pricing is agreed and the applicant
   has a reason to hand over regulated identifiers.

   There is no `account` section and no honeypot: whoever is filling this in is
   already signed in as the partner it belongs to.

   ONE SCHEMA, BOTH SIDES. React Hook Form validates with it in the browser and
   the server action re-parses with the same object. The client copy is a
   convenience so nobody discovers a typo in field three after a round trip;
   the server copy is the actual gate, because anything posted from a browser
   can be posted from curl.

   DISPLAY IN, STORAGE OUT. Masked fields arrive as the user typed them —
   "(727) 555-0142", "03-04-2026" — and `transform` converts them to E.164 and
   ISO on the way through, so the database never stores a format decision.
   ========================================================================= */

const required = (label: string) =>
  z.string({ message: `${label} is required.` }).trim().min(1, `${label} is required.`);

const optionalText = z.string().trim().optional().or(z.literal(""));

const email = z.string().trim().email("Enter a valid email address.");
const optionalEmail = z.union([email, z.literal("")]).optional();

/**
 * Display-format phone in, E.164 out, blank allowed.
 *
 * Every phone on this form is optional, so there is only this variant. A
 * strict one existed alongside it and was never referenced by any field.
 */
const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => v === undefined || isValidUsPhone(v), "Enter a valid US phone number.")
  .transform((v) => (v ? parseUsPhone(v)! : undefined));

const zip = z
  .string()
  .trim()
  .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code.");

const optionalZip = z.union([zip, z.literal("")]).optional();

/** mm-dd-yyyy in, ISO yyyy-mm-dd out. */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => v === undefined || isValidDate(v), "Use mm-dd-yyyy.")
  .transform((v) => (v ? parseDate(v)! : undefined));

export const prescriberSchema = z.object({
  name: required("Prescriber name"),

  /**
   * The form's `signature` field, typed.
   *
   * NOT a legal signature and the UI says so: it is an attestation that the
   * named prescriber authorised the application. The binding signature is
   * captured by DocuSign on the MSA. Treating this as the legal one would put
   * the pharmacy's e-signature compliance on a text input.
   */
  signature: required("Signature"),

  /**
   * Optional.
   *
   * Not every prescriber on a practice's account holds a DEA registration —
   * a mid-level who only prescribes non-controlled preparations has no number
   * to give, and blocking the form on one stopped those accounts cold. The
   * checksum still runs on anything that IS typed, so an optional field is
   * not a lax one: a wrong DEA is rejected exactly as before, only an absent
   * one is now allowed through.
   */
  deaNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine(
      (v) => v === undefined || isValidDea(v),
      "That DEA number fails its checksum — check for a transposed digit."
    ),
  deaExpiration: optionalDate,

  npi: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => v === undefined || isValidNpi(v), "That NPI fails its check digit."),

  stateLicenseNumber: optionalText,
});

export const accountDetailsSchema = z.object({
  howDidYouHearAboutUs: optionalText,
  accountType: z.enum(["new", "existing"], { message: "Choose an account type." }),
  medicraftPharmacyRep: optionalText,

  /** The paper form has room for two prescribers, so the schema does too. */
  prescribers: z.array(prescriberSchema).min(1, "At least one prescriber is required.").max(2),

  practice: z.object({
    name: required("Practice or clinic name"),
    isPrimaryLocation: z.boolean().default(true),
    address: optionalText,
    city: optionalText,
    state: optionalText,
    zip: optionalText,
    phone: optionalPhone,
    fax: optionalPhone,
    officeContact: z
      .object({
        name: optionalText,
        phone: optionalPhone,
        email: optionalEmail,
      })
      .optional(),
  }),

  communicationsPreference: z
    .object({
      prescriptionQuestions: z.object({ email: optionalEmail, phone: optionalPhone }).optional(),
      shippingTracking: z.object({ email: optionalEmail, fax: optionalPhone }).optional(),
      invoicesReceipts: z.object({ email: optionalEmail, fax: optionalPhone }).optional(),
    })
    .optional(),


  /* --- The trading entity ------------------------------------------------
     Who we invoice, where, and who may sign for them. None of this is asked
     on the public form because none of it exists until someone has decided to
     trade with us. */

  legalBusinessName: required("Legal business name"),
  dba: optionalText,

  /**
   * EIN, as nine digits.
   *
   * Encrypted at rest with only the last four kept legible, so it is asked for
   * exactly once and never shown back in full — not on screen, not in email.
   */
  ein: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 9, "An EIN is nine digits."),

  businessStreet: required("Street address"),
  businessSuite: optionalText,
  businessCity: required("City"),
  businessState: required("State"),
  businessZip: zip,

  /**
   * Billing is usually the business address, so the applicant ticks a box
   * rather than retyping it. The ACTION copies the address across when this is
   * true — doing it on the client would let a tampered payload store a billing
   * address the applicant never saw.
   */
  billingSameAsBusiness: z.boolean().default(true),
  billingStreet: optionalText,
  billingSuite: optionalText,
  billingCity: optionalText,
  billingState: optionalText,
  billingZip: optionalZip,

  /** Where the practice operates, by full state name — see US_STATES. */
  statesOfOperation: z.array(z.string().trim().min(2)).min(1, "Choose at least one state."),

  signerName: required("Authorised signer"),
  signerTitle: required("Title"),
  signerEmail: email,
  signerPhone: optionalPhone,

  /** Pharmacy licence for the practice, where one applies. */
  pharmacyLicenseNumber: optionalText,
  pharmacyLicenseState: optionalText,
  pharmacyLicenseExpires: optionalDate,

  accountsPayableEmail: optionalEmail,
  accountsPayablePhone: optionalPhone,

  /** Confirmed before submitting. Never restored from a saved draft. */
  attested: z.literal(true, { message: "Please confirm the details are accurate." }),
});

/** What the form holds while being typed — masks still in display format. */
export type AccountDetailsValues = z.input<typeof accountDetailsSchema>;
/** What survives validation — phones E.164, dates ISO, EIN digits only. */
export type AccountDetailsData = z.output<typeof accountDetailsSchema>;

export const emptyPrescriber = {
  name: "",
  signature: "",
  deaNumber: "",
  deaExpiration: "",
  npi: "",
  stateLicenseNumber: "",
};

/** A blank form, so `useForm` has a fully-shaped default and no field is uncontrolled. */
export const emptyAccountDetails: AccountDetailsValues = {
  howDidYouHearAboutUs: "",
  accountType: "new",
  medicraftPharmacyRep: "",
  prescribers: [{ ...emptyPrescriber }],
  practice: {
    name: "",
    isPrimaryLocation: true,
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    fax: "",
    officeContact: { name: "", phone: "", email: "" },
  },
  communicationsPreference: {
    prescriptionQuestions: { email: "", phone: "" },
    shippingTracking: { email: "", fax: "" },
    invoicesReceipts: { email: "", fax: "" },
  },
  legalBusinessName: "",
  dba: "",
  ein: "",
  businessStreet: "",
  businessSuite: "",
  businessCity: "",
  businessState: "",
  businessZip: "",
  billingSameAsBusiness: true,
  billingStreet: "",
  billingSuite: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
  statesOfOperation: [],
  signerName: "",
  signerTitle: "",
  signerEmail: "",
  signerPhone: "",
  pharmacyLicenseNumber: "",
  pharmacyLicenseState: "",
  pharmacyLicenseExpires: "",
  accountsPayableEmail: "",
  accountsPayablePhone: "",
  attested: true as const,
};

/**
 * The autosaved draft is stored as-is, not schema-validated.
 *
 * A draft is by definition half-typed — a three-digit EIN, an empty required
 * field — so running it through `accountDetailsSchema` would reject nearly
 * every save, and a "partial" variant of a schema this nested is a fiction
 * that validates nothing useful. The real risk with an unvalidated JSON write
 * is size, not shape, so the action caps the payload instead. It is read back
 * only into the same partner's own form.
 */
export const MAX_DRAFT_BYTES = 64 * 1024;
