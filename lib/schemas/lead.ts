import { z } from "zod";

import { isValidUsPhone, parseUsPhone } from "@/lib/masks";

/* ===========================================================================
   The public inquiry — step 1 of the pipeline.

   WHY THIS IS SHORT
   -----------------
   It used to be the forty-field account-setup questionnaire: DEA numbers,
   prescriber signatures, communications preferences, all before the inquirer
   had seen a single price. That asks a practice to hand over regulated
   identifiers to a company they have not yet decided to trade with, and it is
   the reason a form like that gets abandoned two screens in.

   Everything here is what we need to decide whether to send them a formulary
   and to give them a way back in. The rest is asked in the portal once the
   pricing is agreed — see lib/schemas/account-setup.ts.

   Same idempotency rule as every other schema in this directory: transforms
   accept their own output, because the client validates with this schema and
   the server then parses the result a second time.
   ========================================================================= */

const required = (label: string) =>
  z.string({ message: `${label} is required.` }).trim().min(1, `${label} is required.`);

const optionalText = z.string().trim().optional().or(z.literal(""));

const phone = z
  .string()
  .trim()
  .refine(isValidUsPhone, "Enter a valid US phone number.")
  .transform((v) => parseUsPhone(v)!);

export const leadSchema = z.object({
  firstName: required("First name"),
  lastName: required("Last name"),
  phone,
  role: required("Your role"),

  practiceName: required("Practice name"),
  website: optionalText,

  street: optionalText,
  suite: optionalText,
  city: optionalText,
  state: optionalText,
  zip: z.union([z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code."), z.literal("")]).optional(),

  orgType: required("Tell us how you operate"),
  medications: optionalText,
  notes: optionalText,
  referral: optionalText,

  /* Sign-in. They need a way back into the portal to see the formulary we are
     about to send, so the inquiry and the account are created together rather
     than emailing a magic link that expires before anyone clicks it. */
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    // Length beats composition rules for real-world strength, but a minimum of
    // three classes stops "aaaaaaaaaaaa" clearing a 12-character bar.
    .refine(
      (v) => [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(v)).length >= 3,
      "Mix upper case, lower case, numbers or symbols."
    ),

  /** Honeypot. Hidden from people, so any value at all means a bot. */
  nickname: z.literal("").optional(),
});

export type LeadValues = z.input<typeof leadSchema>;
export type LeadData = z.output<typeof leadSchema>;

export const emptyLead: LeadValues = {
  firstName: "",
  lastName: "",
  phone: "",
  role: "",
  practiceName: "",
  website: "",
  street: "",
  suite: "",
  city: "",
  state: "",
  zip: "",
  orgType: "",
  medications: "",
  notes: "",
  referral: "",
  email: "",
  password: "",
  nickname: "",
};
