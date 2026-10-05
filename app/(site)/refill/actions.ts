"use server";

import { headers } from "next/headers";

import type { FormState } from "@/lib/forms";
import { refillSchema, validate } from "@/lib/forms.schema";
import { clientIp, RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { recordInquiry } from "@/lib/services/inquiries";
import { notifyStaffOfInquiry } from "@/lib/services/inquiry-notify";

/**
 * Patient refill requests.
 *
 * This used to validate, `console.log` the whole submission and return a
 * success message. Two separate problems: the request went nowhere, so a
 * patient was told it had been received when it had not — and the log line
 * wrote a named patient, their date of birth and their medication into the
 * host's plaintext logs.
 *
 * The request is now stored sealed, and staff are told that one arrived with a
 * link and no detail. Nobody's medication reaches an inbox or a log file.
 */
export async function requestRefill(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const result = validate(refillSchema, data);
  if (!result.ok) return result.state;

  const requestHeaders = headers();
  const ip = clientIp(requestHeaders);

  if (!rateLimit(`refill:${ip}`, RATE_LIMITS.email).ok) {
    return {
      ok: false,
      message: "Too many requests from this connection. Please call us instead.",
    };
  }

  try {
    const inquiry = await recordInquiry({
      kind: "REFILL",
      payload: result.data as unknown as Record<string, unknown>,
      ip,
    });

    await notifyStaffOfInquiry(inquiry.id, "REFILL");
  } catch (error) {
    // Never echo the submission into the error path either.
    console.error("[refill] could not record the request", (error as Error)?.message);
    return {
      ok: false,
      message:
        "We could not record your request. Please call the pharmacy so nothing is missed.",
    };
  }

  return {
    ok: true,
    message:
      "Your refill request has been received. We'll confirm by phone or email once it's in our fulfillment queue.",
  };
}
