import "server-only";

import { z } from "zod";

import type { FormState } from "@/lib/forms";

/* ===========================================================================
   Form validation.

   Validation is defined here as zod schemas and runs on the server, inside the
   action. That placement is deliberate and worth stating, because the usual
   shadcn pairing is react-hook-form + zod running in the browser:

     Every form on this site is a server action with no client-side validation
     library. The form element posts natively, so it works with JavaScript
     disabled or still loading — which is also why the controls carry `required`
     and `type="email"`, letting the browser catch the common mistakes before a
     round trip. Moving validation into the client would mean the form silently
     stopped working for anyone whose JS failed, in exchange for saving one
     request on a form submitted once per visitor.

   The schemas replace a hand-rolled `requireFields` + regex pair. What that
   buys beyond tidiness: `z.infer` gives each action a typed submission object,
   so the `data.get("x")?.toString()` blocks that used to build those objects by
   hand — and could silently disagree with the validated field list — are gone.

   The `server-only` import at the top is the guard rail for the split described
   in lib/forms.ts: importing this module from a client component is now a build
   error rather than a silent 27 kB of zod in the browser bundle.
   ========================================================================= */

/* --- Reusable field rules ------------------------------------------------ */

/**
 * A required text field.
 *
 * `.trim()` runs before the length check, so a field holding only spaces is
 * caught rather than accepted — the previous implementation trimmed too, and
 * losing that would quietly let whitespace-only names through.
 */
const required = (label: string) =>
  z
    .string({ message: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`);

const optionalText = z.string().trim().optional();

const email = z
  .string({ message: "Email address is required." })
  .trim()
  .min(1, "Email address is required.")
  .email("Enter a valid email address.");

/** Five digits, or ZIP+4. */
const zip = z
  .string({ message: "ZIP code is required." })
  .trim()
  .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code.");

/** A US postal address, shared by the refill and provider forms. */
const addressFields = {
  street: required("Street address"),
  suite: optionalText,
  city: required("City"),
  state: required("State"),
  zip,
};

/* --- Schemas ------------------------------------------------------------- */

export const contactSchema = z.object({
  firstName: required("First name"),
  lastName: required("Last name"),
  email,
  phone: optionalText,
  role: optionalText,
  message: required("Message"),
});

export const refillSchema = z.object({
  firstName: required("First name"),
  lastName: required("Last name"),
  dob: required("Date of birth"),
  phone: required("Phone"),
  email,
  rxNumber: optionalText,
  medication: required("Medication name"),
  prescriber: optionalText,
  ...addressFields,
  notes: optionalText,
});

export const providerSchema = z.object({
  firstName: required("First name"),
  lastName: required("Last name"),
  email,
  phone: required("Phone"),
  role: required("Your role"),
  practiceName: required("Practice / company name"),
  website: optionalText,
  ...addressFields,
  orgType: required("Organization type"),
  medications: optionalText,
  notes: optionalText,
  referral: required("Referral source"),
});

/**
 * The careers form.
 *
 * `resume` is deliberately absent: a file input yields a `File` in the
 * FormData, not a string, and the action checks it separately against
 * RESUME_MAX_BYTES / RESUME_TYPES. Declaring it here would make the schema
 * claim to validate something it does not.
 */
export const careerSchema = z.object({
  firstName: required("First name"),
  lastName: required("Last name"),
  email,
  phone: required("Phone"),
  referral: required("Referral source"),
  relocate: required("Relocation preference"),
});

export type ContactSubmission = z.infer<typeof contactSchema>;
export type RefillSubmission = z.infer<typeof refillSchema>;
export type ProviderSubmission = z.infer<typeof providerSchema>;
export type CareerSubmission = z.infer<typeof careerSchema>;

/* --- The bridge between zod and the form components ---------------------- */

/**
 * Validate a FormData against a schema.
 *
 * Returns either the parsed submission or a `FormState` shaped exactly as the
 * field components already expect — a flat `field → message` map — so the
 * components did not have to change to gain zod.
 *
 * Only the first issue per field is kept. A field showing two messages at once
 * ("Email address is required." above "Enter a valid email address.") reads as
 * a malfunction rather than as guidance.
 *
 * Reads issues off `error.issues` rather than `.flatten()`, which zod v4
 * deprecated — `issues` has been stable across both major versions.
 */
export function validate<T extends z.ZodType>(
  schema: T,
  data: FormData
): { ok: true; data: z.infer<T> } | { ok: false; state: FormState } {
  const result = schema.safeParse(Object.fromEntries(data));

  if (result.success) return { ok: true, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return {
    ok: false,
    state: {
      ok: false,
      errors,
      message: "Please correct the highlighted fields.",
    },
  };
}
