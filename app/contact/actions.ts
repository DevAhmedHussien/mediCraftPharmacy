"use server";

import { isEmail, requireFields, type FormState } from "@/lib/forms";

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
  const errors = requireFields(data, [
    { name: "firstName", label: "First name" },
    { name: "lastName", label: "Last name" },
    { name: "email", label: "Email address" },
    { name: "message", label: "Message" },
  ]);

  const email = (data.get("email") ?? "").toString();
  if (!errors.email && !isEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please correct the highlighted fields.", errors };
  }

  // TODO: deliver the enquiry — e.g. send to site.email via a transactional
  // email provider, or POST into the pharmacy's CRM. Nothing is sent yet.

  return {
    ok: true,
    message: "Message sent. We'll be in touch within one business day.",
  };
}
