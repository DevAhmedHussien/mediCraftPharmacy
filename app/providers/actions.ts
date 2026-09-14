"use server";

import type { FormState } from "@/lib/forms";
import { providerSchema, validate } from "@/lib/forms.schema";

export async function enrollProvider(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const result = validate(providerSchema, data);
  if (!result.ok) return result.state;

  // TODO: wire this submission to your backend — e.g. send an email, create a
  // GoHighLevel contact/opportunity, or persist to a database. This runs on
  // the server, so secrets/API keys are safe to use here.
  console.log("[new-provider] enrollment submission", result.data);

  return {
    ok: true,
    message:
      "Thank you — your enrollment is in. Our onboarding team will reach out within one to two business days.",
  };
}
