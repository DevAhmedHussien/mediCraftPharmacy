"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/forms";
import { requirePermission } from "@/lib/guard";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/services/email";
import { offerMeetingSlots, scheduleMeeting } from "@/lib/services/meetings";
import { saveDraftLines, sendDraft, startDraft } from "@/lib/services/pricing";
import { applyTransition } from "@/lib/services/transition";
import { fromLocalInputValue } from "@/lib/services/calendar";

/* Pricing-stage admin actions.

   Each one does its own domain work and then hands the status change to
   `applyTransition`, which re-derives the edge from the state machine and
   re-checks the permission it declares. Nothing here decides whether a
   transition is legal — that would be a second copy of the rules. */

function fail(message: string): FormState {
  return { ok: false, message };
}

const longTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

/**
 * Offer the applicant a choice of times.
 *
 * Deliberately does NOT move the partner's status. Nothing is booked until
 * they pick one, and a status of PRICING_MEETING with no agreed time is how
 * an admin ends up blocking out an hour for a call the applicant never saw.
 * The status moves when they choose — see `confirmMeetingSlotAction`.
 *
 * The email is sent here rather than through `applyTransition` for the same
 * reason: there is no transition to hang it on. It is a direct send, logged
 * like any other.
 */
export async function offerMeetingSlotsAction(
  partnerId: string,
  meetingId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requirePermission("pricing.review");

  const duration = Number(data.get("durationMinutes") ?? 30);
  const location = String(data.get("location") ?? "").trim();
  const adminNotes = String(data.get("adminNotes") ?? "").trim();

  /* Up to three, and the form posts a `slots` entry per filled box. Blank
     boxes are dropped rather than rejected — offering two times is a normal
     thing to want to do.

     Parsed in the PHARMACY'S zone, not with `new Date(v)`. A datetime-local
     value carries no offset, so `new Date` reads it as the server's local
     time: an admin typing 9:00 AM became 09:00 UTC on a UTC host, which is
     5:00 AM in Florida. The time offered then depended on where the app
     happened to be deployed. See fromLocalInputValue. */
  const slots = data
    .getAll("slots")
    .map((v) => String(v))
    .filter((v) => v.length > 0)
    .map((v) => fromLocalInputValue(v));

  if (slots.length === 0) {
    return { ok: false, errors: { slots: "Offer at least one time." } };
  }
  if (slots.some((d) => Number.isNaN(d.getTime()))) {
    return { ok: false, errors: { slots: "One of those is not a valid date and time." } };
  }
  if (slots.some((d) => d.getTime() < Date.now())) {
    return { ok: false, errors: { slots: "Offering a time in the past books nothing." } };
  }

  // De-duplicate and order, so the applicant sees a clean list even if the
  // admin typed the same time twice.
  const unique = [...new Map(slots.map((d) => [d.getTime(), d])).values()].sort(
    (a, b) => a.getTime() - b.getTime()
  );

  await offerMeetingSlots({
    meetingId,
    slots: unique,
    durationMinutes: Number.isFinite(duration) ? duration : 30,
    location,
    adminNotes,
    scheduledById: session.user.id,
  });

  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { companyName: true, contactName: true, user: { select: { email: true } } },
  });

  if (partner?.user?.email) {
    await sendEmail("partner/meeting-times-offered", partner.user.email, {
      partnerId,
      companyName: partner.companyName,
      contactName: partner.contactName,
      slotList: unique.map((d) => `  · ${longTime(d)}`).join("\n"),
      location,
    });
  }

  revalidatePath(`/admin/partners/${partnerId}`);
  return {
    ok: true,
    message: `${unique.length} ${unique.length === 1 ? "time" : "times"} offered. The applicant has been emailed to pick one.`,
  };
}

/** Put a time on a requested meeting, then move the partner to PRICING_MEETING. */
export async function scheduleMeetingAction(
  partnerId: string,
  meetingId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requirePermission("pricing.review");

  const when = String(data.get("scheduledAt") ?? "");
  const duration = Number(data.get("durationMinutes") ?? 30);
  const location = String(data.get("location") ?? "").trim();
  const adminNotes = String(data.get("adminNotes") ?? "").trim();

  const scheduledAt = new Date(when);
  if (!when || Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, errors: { scheduledAt: "Pick a date and time." } };
  }
  if (scheduledAt.getTime() < Date.now()) {
    // A meeting in the past is always a typo, and the applicant would be
    // emailed a time that has already passed.
    return { ok: false, errors: { scheduledAt: "That time is in the past." } };
  }

  await scheduleMeeting({
    meetingId,
    scheduledAt,
    durationMinutes: Number.isFinite(duration) ? duration : 30,
    location,
    adminNotes,
    scheduledById: session.user.id,
  });

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.PRICING_MEETING,
      actor: "ADMIN",
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role,
      isSuperAdmin: session.user.role === "SUPER_ADMIN",
      permissions: session.user.permissions,
      note: `Meeting set for ${scheduledAt.toLocaleString("en-US")}${location ? ` (${location})` : ""}.`,
      emailProps: {
        scheduledAt: scheduledAt.toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        }),
        location,
      },
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) return fail(error.message);
    throw error;
  }

  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true, message: "Meeting scheduled and the applicant has been emailed." };
}

/** Open (or reopen) the draft the admin edits. */
export async function startDraftAction(partnerId: string): Promise<void> {
  const session = await requirePermission("pricing.review");
  await startDraft(partnerId, session.user.id);
  revalidatePath(`/admin/partners/${partnerId}`);
}

/**
 * Save the discount column.
 *
 * Every line posts, not just the changed ones — a partial save would mean the
 * form and the database disagree about lines the admin cleared.
 */
export async function saveDraftAction(
  partnerId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  await requirePermission("pricing.review");

  const lines: { itemId: string; discountPercent: string; adminComment: string }[] = [];
  for (const [key, value] of data.entries()) {
    const match = /^discount:(.+)$/.exec(key);
    if (!match) continue;

    const discount = String(value).trim() || "0";
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(discount) || Number(discount) > 100) {
      return { ok: false, message: `“${discount}” is not a discount between 0 and 100.` };
    }

    lines.push({
      itemId: match[1]!,
      discountPercent: discount,
      adminComment: String(data.get(`comment:${match[1]}`) ?? "").trim(),
    });
  }

  await saveDraftLines(partnerId, lines);
  revalidatePath(`/admin/partners/${partnerId}`);

  return { ok: true, message: `Saved ${lines.length} lines.` };
}

/** Save, then send it to the applicant. */
export async function sendPricingAction(
  partnerId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requirePermission("pricing.review");

  // Save first: sending a draft the admin edited but did not save would send
  // the previous numbers while showing the new ones.
  const saved = await saveDraftAction(partnerId, { ok: false }, data);
  if (!saved.ok) return saved;

  const comment = String(data.get("adminComment") ?? "").trim();
  await sendDraft(partnerId, comment);

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.NEGOTIATED_PRICING_SENT,
      actor: "ADMIN",
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role,
      isSuperAdmin: session.user.role === "SUPER_ADMIN",
      permissions: session.user.permissions,
      note: comment || "Negotiated pricing sent.",
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) return fail(error.message);
    throw error;
  }

  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true, message: "Pricing sent. The applicant has been emailed." };
}
