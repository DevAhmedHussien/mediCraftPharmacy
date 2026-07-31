"use server";

import { type FormState, isEmail, isZip, requireFields } from "@/lib/forms";

export async function requestRefill(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const errors = requireFields(data, [
    { name: "firstName", label: "First name" },
    { name: "lastName", label: "Last name" },
    { name: "dob", label: "Date of birth" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email" },
    { name: "medication", label: "Medication name" },
    { name: "street", label: "Street address" },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
    { name: "zip", label: "ZIP code" },
  ]);

  const email = (data.get("email") ?? "").toString();
  if (email && !isEmail(email)) errors.email = "Enter a valid email address.";

  const zip = (data.get("zip") ?? "").toString();
  if (zip && !isZip(zip)) errors.zip = "Enter a valid ZIP code.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: "Please fix the highlighted fields." };
  }

  const submission = {
    firstName: data.get("firstName")?.toString(),
    lastName: data.get("lastName")?.toString(),
    dob: data.get("dob")?.toString(),
    phone: data.get("phone")?.toString(),
    email,
    rxNumber: data.get("rxNumber")?.toString(),
    medication: data.get("medication")?.toString(),
    prescriber: data.get("prescriber")?.toString(),
    street: data.get("street")?.toString(),
    suite: data.get("suite")?.toString(),
    city: data.get("city")?.toString(),
    state: data.get("state")?.toString(),
    zip,
    notes: data.get("notes")?.toString(),
  };

  // TODO: wire this submission to your fulfillment queue — e.g. send an email,
  // create a GoHighLevel contact/opportunity, or persist to a database. Runs on
  // the server, so secrets/API keys are safe here.
  console.log("[patient-refill] refill request", submission);

  return {
    ok: true,
    message:
      "Your refill request has been received. We'll confirm by phone or email once it's in our fulfillment queue.",
  };
}
