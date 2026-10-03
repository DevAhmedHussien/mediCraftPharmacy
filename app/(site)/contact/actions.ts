"use server";

import { headers } from "next/headers";

import type { FormState } from "@/lib/forms";
import { contactSchema, validate } from "@/lib/forms.schema";
import { env } from "@/lib/env";
import { clientIp, RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { recordEnquiry } from "@/lib/services/enquiries";
import { notifyStaffOfEnquiry } from "@/lib/services/enquiry-notify";
import { upsertGhlContact } from "@/lib/services/ghl";

/**
 * Contact form.
 *
 * It used to validate and `console.log`, which meant a visitor got a success
 * message for a message nobody received — worse than having no form.
 */
export async function submitContact(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const result = validate(contactSchema, data);
  if (!result.ok) return result.state;

  const ip = clientIp(headers());
  if (!rateLimit(`contact:${ip}`, RATE_LIMITS.email).ok) {
    return { ok: false, message: "Too many messages from this connection. Please try later." };
  }

  const payload = result.data as Record<string, unknown>;

  try {
    const enquiry = await recordEnquiry({
      kind: "CONTACT",
      name: [payload.firstName, payload.lastName].filter(Boolean).join(" "),
      email: String(payload.email ?? ""),
      phone: String(payload.phone ?? ""),
      subject: String(payload.subject ?? payload.topic ?? "Website enquiry"),
      payload,
      ip,
    });

    await notifyStaffOfEnquiry(enquiry.id, "CONTACT");

    /* Mirror into the CRM, outside the path that decides what the visitor is
       told. The enquiry is already stored and staff are already notified, so a
       GoHighLevel outage must not turn into "we could not send that" and a
       duplicate submission. A failure is logged with GHL's own reason and
       nothing of the person's. */
    const crm = await upsertGhlContact({
      firstName: String(payload.firstName ?? ""),
      lastName: String(payload.lastName ?? ""),
      email: String(payload.email ?? ""),
      phone: String(payload.phone ?? ""),
      source: String(payload.subject ?? payload.topic ?? "Website contact form"),
      tags: [env.GHL_CONTACT_TAG],
    });
    if (!crm.ok) console.error("[contact] GHL upsert failed:", crm.reason);
  } catch (error) {
    console.error("[contact] could not record the enquiry", (error as Error)?.message);
    return { ok: false, message: "We could not send that. Please try again, or call us." };
  }

  return { ok: true, message: "Message sent. We'll be in touch within one business day." };
}
