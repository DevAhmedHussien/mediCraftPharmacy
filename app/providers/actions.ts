"use server";

import {
  type FormState,
  isEmail,
  requireFields,
} from "@/lib/forms";

export async function enrollProvider(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const errors = requireFields(data, [
    { name: "firstName", label: "First name" },
    { name: "lastName", label: "Last name" },
    { name: "email", label: "Email" },
    { name: "phone", label: "Phone" },
    { name: "role", label: "Your role" },
    { name: "practiceName", label: "Practice / company name" },
    { name: "street", label: "Street address" },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
    { name: "zip", label: "ZIP code" },
    { name: "orgType", label: "Organization type" },
    { name: "referral", label: "Referral source" },
  ]);

  const email = (data.get("email") ?? "").toString();
  if (email && !isEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: "Please fix the highlighted fields." };
  }

  const submission = {
    firstName: data.get("firstName")?.toString(),
    lastName: data.get("lastName")?.toString(),
    email,
    phone: data.get("phone")?.toString(),
    role: data.get("role")?.toString(),
    practiceName: data.get("practiceName")?.toString(),
    website: data.get("website")?.toString(),
    street: data.get("street")?.toString(),
    suite: data.get("suite")?.toString(),
    city: data.get("city")?.toString(),
    state: data.get("state")?.toString(),
    zip: data.get("zip")?.toString(),
    orgType: data.get("orgType")?.toString(),
    medications: data.get("medications")?.toString(),
    notes: data.get("notes")?.toString(),
    referral: data.get("referral")?.toString(),
  };

  // TODO: wire this submission to your backend — e.g. send an email, create a
  // GoHighLevel contact/opportunity, or persist to a database. This runs on
  // the server, so secrets/API keys are safe to use here.
  console.log("[new-provider] enrollment submission", submission);

  return {
    ok: true,
    message:
      "Thank you — your enrollment is in. Our onboarding team will reach out within one to two business days.",
  };
}
