"use server";

import type { FormState } from "@/lib/forms";
import { contactSchema, validate } from "@/lib/forms.schema";

/**
 * Contact form handler.
 *
 * Validation only, for now: it checks the submission and reports back, but does
 * not yet deliver anywhere. Wire a transactional email provider (or the
 * pharmacy's CRM) in at the marked point before launch — until then a visitor
 * gets a success message for a message nobody receives, which is worse than no
 * form at all.
 */
export async function submitContact(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const result = validate(contactSchema, data);
  if (!result.ok) return result.state;

  // TODO: deliver the enquiry — e.g. send to site.email via a transactional
  // email provider, or POST into the pharmacy's CRM. Nothing is sent yet.
  console.log("[contact] enquiry", result.data);

  return {
    ok: true,
    message: "Message sent. We'll be in touch within one business day.",
  };
}
