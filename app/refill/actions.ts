"use server";

import type { FormState } from "@/lib/forms";
import { refillSchema, validate } from "@/lib/forms.schema";

export async function requestRefill(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const result = validate(refillSchema, data);
  if (!result.ok) return result.state;

  // TODO: wire this submission to your fulfillment queue — e.g. send an email,
  // create a GoHighLevel contact/opportunity, or persist to a database. Runs on
  // the server, so secrets/API keys are safe here.
  //
  // NOTE: this payload is PHI — a named patient, their date of birth and their
  // medication. Whatever it is wired to has to be a HIPAA-eligible service
  // under a BAA, and this console.log has to go at the same time: it writes
  // patient health data into the host's plaintext logs.
  console.log("[patient-refill] refill request", result.data);

  return {
    ok: true,
    message:
      "Your refill request has been received. We'll confirm by phone or email once it's in our fulfillment queue.",
  };
}
