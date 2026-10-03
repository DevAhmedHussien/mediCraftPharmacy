import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { signature, SignatureError } from "@/lib/services/signature";
import { applyTransition } from "@/lib/services/transition";

/* ===========================================================================
   SignEasy completion.

   The ONLY route that may move a partner to MSA_SIGNED. The transition table
   marks that edge `SYSTEM`, which means no human actor value will carry it —
   so there is no form, and no admin button, that can fake a signature.

   THREE THINGS THIS DOES BEFORE IT BELIEVES ANYTHING
   --------------------------------------------------
   1. Verifies the HMAC over the RAW body. Parsing first and re-serialising
      would hash a different byte string than the one that was signed, and the
      check would pass for a forged payload that happens to re-serialise the
      same way.
   2. Records the event under its provider id, which is uniquely indexed.
      SignEasy redelivers; a second delivery hits the conflict and returns
      early rather than transitioning twice.
   3. Resolves the partner from the ENVELOPE in our own database, never from a
      field in the payload. A payload that could name its own partner would be
      a way to sign someone else's agreement.
   ========================================================================= */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The header SignEasy signs its deliveries with. */
const SIGNATURE_HEADER = "x-signeasy-signature";

function verify(raw: string, provided: string | null): boolean {
  if (!env.SIGNEASY_WEBHOOK_SECRET || !provided) return false;

  const expected = createHmac("sha256", env.SIGNEASY_WEBHOOK_SECRET).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided.replace(/^sha256=/, ""), "utf8");

  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and a thrown comparison is still a failed one.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const raw = await request.text();

  if (!verify(raw, request.headers.get(SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let payload: {
    id?: string;
    event?: string;
    signature_request_id?: string;
    signer?: { name?: string; email?: string };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed body." }, { status: 400 });
  }

  const eventId = payload.id;
  const envelopeId = payload.signature_request_id;
  const eventType = payload.event ?? "unknown";

  if (!eventId || !envelopeId) {
    return NextResponse.json({ error: "Missing event or request id." }, { status: 400 });
  }

  /* Claim the delivery. A duplicate loses the race on the unique index and
     returns here, before anything is acted on. */
  try {
    await db.webhookEvent.create({
      data: {
        provider: "SIGNEASY",
        externalId: eventId,
        eventType,
        payload: payload as object,
      },
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  /* Anything other than completion is stored and acknowledged. Declines and
     views are real events worth having in the table; only one of them moves a
     partner, and inventing transitions for the rest would mean a status that
     changes every time somebody opens the PDF. */
  if (eventType !== "signature_request.completed" && eventType !== "completed") {
    await db.webhookEvent.update({
      where: { provider_externalId: { provider: "SIGNEASY", externalId: eventId } },
      data: { processedAt: new Date() },
    });
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const envelope = await db.msaEnvelope.findUnique({
    where: { envelopeId },
    select: { partnerId: true, signerName: true },
  });

  if (!envelope) {
    await db.webhookEvent.update({
      where: { provider_externalId: { provider: "SIGNEASY", externalId: eventId } },
      data: { error: `No envelope ${envelopeId}` },
    });
    // 200, not 404: the delivery was well-formed and authentic, and asking
    // SignEasy to retry forever against an envelope we do not have helps
    // nobody. The error column is where this is visible.
    return NextResponse.json({ ok: true, unknownEnvelope: true });
  }

  try {
    const moved = await signature.complete({
      envelopeId,
      typedName: payload.signer?.name ?? envelope.signerName,
      agreementText: "",
      ip: null,
      userAgent: null,
    });

    if (moved) {
      await applyTransition({
        partnerId: envelope.partnerId,
        to: PARTNER_STATUS.MSA_SIGNED,
        actor: "SYSTEM",
        note: "Signed through SignEasy.",
      });
    }

    await db.webhookEvent.update({
      where: { provider_externalId: { provider: "SIGNEASY", externalId: eventId } },
      data: { processedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.webhookEvent.update({
      where: { provider_externalId: { provider: "SIGNEASY", externalId: eventId } },
      data: { error: message },
    });

    // 500 so SignEasy retries — this one IS worth retrying, because the
    // envelope exists and something transient stopped it being recorded.
    const status = error instanceof SignatureError ? error.httpStatus : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
