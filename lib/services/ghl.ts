import "server-only";

import { env } from "@/lib/env";

/* ===========================================================================
   GoHighLevel — mirroring public inquiries into the CRM.

   UPSERT, NOT CREATE
   ------------------
   `POST /contacts/` refuses with a 400 when a contact with that email or phone
   already exists in the location. On a public contact form that is the common
   case, not the edge one: people inquire twice, and the people most worth
   routing to sales are often already in the CRM from a call or a campaign. A
   plain create would fail for exactly those.

   `POST /contacts/upsert` matches on email, then phone, within the location —
   updating when it finds one and creating when it does not. Tags are merged
   rather than replaced, so a contact that already carries `partner_applicant`
   keeps it and gains `contact_us_form` alongside.

   FAILING HERE MUST NOT FAIL THE INQUIRY
   -------------------------------------
   The inquiry is already recorded in our own database before this runs, and
   staff are notified from that record. GoHighLevel being down, rate limiting
   us, or rotating a token is a CRM problem, not a reason to tell someone their
   message did not send and make them submit it again. Every failure path here
   returns a result object; none of them throw.

   WHAT IS NOT LOGGED
   ------------------
   No name, email, phone or message body ever reaches a log line — only the
   status code and GHL's own error text. The same rule the inquiry service and
   the refill action follow.
   ========================================================================= */

/**
 * How long to wait on LeadConnector before giving up.
 *
 * Generous because nothing here is on a request path any more: partner syncs
 * run from the outbox worker, where a slow answer costs a few seconds of a
 * background job rather than a few seconds of someone's form submit.
 */
const TIMEOUT_MS = 12_000;

export type GhlResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; contactId: string; created: boolean }
  | { ok: false; reason: string };

export type GhlContactInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** The practice, so sales sees an organisation and not just a person. */
  companyName?: string;
  /** Free-text note shown on the contact, e.g. the inquiry subject. */
  source?: string;
  /** Extra tags on top of the configured default. */
  tags?: string[];
  /** Written to GHL custom fields only if the account defines them. */
  customFields?: { key: string; field_value: string }[];
};

export const ghlConfigured = Boolean(env.GHL_API_TOKEN && env.GHL_LOCATION_ID);

/**
 * Create or update a contact in GoHighLevel.
 *
 * Returns `{ ok: true, skipped: true }` when GHL is not configured, so callers
 * can treat "not set up" and "worked" the same way without branching.
 */
export async function upsertGhlContact(input: GhlContactInput): Promise<GhlResult> {
  if (!ghlConfigured) return { ok: true, skipped: true };

  // GHL matches on email or phone. With neither there is nothing to upsert
  // against, and it would create an unreachable duplicate on every submission.
  if (!input.email && !input.phone) {
    return { ok: false, reason: "no email or phone to match on" };
  }

  /* The caller names its own tags.
   *
   * `GHL_CONTACT_TAG` used to be mixed in here, which meant every upsert wore
   * it — so a provider opening an account arrived in the CRM tagged as a
   * website contact-form submission. The source tag belongs to whichever
   * surface the person actually came through, so the contact form passes it
   * and the partner sync passes its own. */
  const tags = Array.from(new Set((input.tags ?? []).filter(Boolean)));

  const body = {
    locationId: env.GHL_LOCATION_ID,
    firstName: input.firstName || undefined,
    lastName: input.lastName || undefined,
    email: input.email || undefined,
    phone: input.phone || undefined,
    companyName: input.companyName || undefined,
    source: input.source || "Website contact form",
    tags,
    ...(input.customFields?.length ? { customFields: input.customFields } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.GHL_API_BASE}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GHL_API_TOKEN}`,
        Version: env.GHL_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      // GHL's message, never our payload.
      const detail = await response.text().catch(() => "");
      return { ok: false, reason: `HTTP ${response.status} ${detail.slice(0, 200)}` };
    }

    const json = (await response.json()) as {
      contact?: { id?: string };
      new?: boolean;
    };

    const contactId = json.contact?.id;
    if (!contactId) return { ok: false, reason: "upsert returned no contact id" };

    return { ok: true, skipped: false, contactId, created: json.new === true };
  } catch (error) {
    const reason =
      (error as Error)?.name === "AbortError"
        ? `no response within ${TIMEOUT_MS}ms`
        : ((error as Error)?.message ?? "unknown transport error");
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/* --- Tags on an existing contact ----------------------------------------- */

/**
 * The shared request path for the two tag endpoints.
 *
 * Same contract as the upsert: never throws, never logs anything of the
 * person's, and gives up after TIMEOUT_MS rather than holding a transition
 * open while LeadConnector decides whether to answer.
 */
async function tagRequest(
  method: "POST" | "DELETE",
  contactId: string,
  tags: string[]
): Promise<GhlResult> {
  if (!ghlConfigured) return { ok: true, skipped: true };
  if (!tags.length) return { ok: true, skipped: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.GHL_API_BASE}/contacts/${contactId}/tags`, {
      method,
      headers: {
        Authorization: `Bearer ${env.GHL_API_TOKEN}`,
        Version: env.GHL_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tags }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, reason: `HTTP ${response.status} ${detail.slice(0, 200)}` };
    }
    return { ok: true, skipped: false, contactId, created: false };
  } catch (error) {
    const reason =
      (error as Error)?.name === "AbortError"
        ? `no response within ${TIMEOUT_MS}ms`
        : ((error as Error)?.message ?? "unknown transport error");
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/** Add tags to a contact. Existing tags are kept. */
export const addGhlTags = (contactId: string, tags: string[]) =>
  tagRequest("POST", contactId, tags);

/**
 * Remove tags from a contact.
 *
 * Removing a tag the contact does not have is not an error on GHL's side, so
 * callers can pass the whole "everything except the current stage" list
 * without first reading which ones are actually present.
 */
export const removeGhlTags = (contactId: string, tags: string[]) =>
  tagRequest("DELETE", contactId, tags);

/**
 * Patch fields onto a contact we already hold the id for.
 *
 * Exists so a partner's phone number can be set *after* the upsert that
 * created them rather than inside it. GoHighLevel's upsert matches on email
 * and then falls back to phone, so sending a phone number makes it a matching
 * key — and two prescribers at one practice who share a switchboard number
 * would be merged into a single contact, their pipeline tags intermingled and
 * the stage pointer rendered meaningless. Omitting phone from the upsert makes
 * the account email the only thing identity can turn on, which is correct:
 * that email is their login and is unique by construction.
 */
export async function updateGhlContact(
  contactId: string,
  fields: { phone?: string; companyName?: string }
): Promise<GhlResult> {
  if (!ghlConfigured) return { ok: true, skipped: true };

  const body = Object.fromEntries(Object.entries(fields).filter(([, v]) => v));
  if (!Object.keys(body).length) return { ok: true, skipped: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.GHL_API_BASE}/contacts/${contactId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${env.GHL_API_TOKEN}`,
        Version: env.GHL_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, reason: `HTTP ${response.status} ${detail.slice(0, 200)}` };
    }
    return { ok: true, skipped: false, contactId, created: false };
  } catch (error) {
    const reason =
      (error as Error)?.name === "AbortError"
        ? `no response within ${TIMEOUT_MS}ms`
        : ((error as Error)?.message ?? "unknown transport error");
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}
