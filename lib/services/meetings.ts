import "server-only";

import { db } from "@/lib/db";
import { calendar } from "@/lib/services/calendar";

/* Meeting request, offer and confirmation.

   THREE STATES, READ FROM THE DATA RATHER THAN FROM A STATUS COLUMN

     requested  — `proposedSlots` empty and `scheduledAt` null. We have their
                  reasons; nobody has looked at a diary yet.
     offered    — `proposedSlots` non-empty, `scheduledAt` still null. Times
                  are on the table and the applicant has to pick one.
     booked     — `scheduledAt` set. `confirmedAt` additionally set means THEY
                  picked it, which is the difference the portal card states.

   The partner status stays MEETING_REQUESTED across the first two, exactly as
   it did when there was only one of them. Adding an enum member for "offered"
   would mean a new row in the transition table, a new explanation string, a
   new GHL tag and a new email — for a distinction two existing columns
   already make unambiguously. */

/**
 * The partner's call about their ORIGINAL application.
 *
 * `amendmentId: null` is load-bearing. A verified partner negotiating a change
 * order gets a second meeting row, and it is newer — so without this filter
 * the portal's application card and the admin's pipeline panel would both
 * start showing a call that is about something else entirely.
 */
export async function getLatestMeeting(partnerId: string) {
  return db.meeting.findFirst({
    where: { partnerId, amendmentId: null },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      requestNotes: true,
      requestedAt: true,
      proposedSlots: true,
      slotsOfferedAt: true,
      scheduledAt: true,
      confirmedAt: true,
      partnerNote: true,
      durationMinutes: true,
      location: true,
      conferenceUrl: true,
      adminNotes: true,
    },
  });
}

export async function requestMeeting(partnerId: string, requestNotes: string) {
  return db.meeting.create({ data: { partnerId, requestNotes } });
}

/** The call about one change order, if there is one. */
export async function getAmendmentMeeting(amendmentId: string) {
  return db.meeting.findFirst({
    where: { amendmentId },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      requestNotes: true,
      requestedAt: true,
      proposedSlots: true,
      slotsOfferedAt: true,
      scheduledAt: true,
      confirmedAt: true,
      partnerNote: true,
      durationMinutes: true,
      location: true,
      conferenceUrl: true,
      adminNotes: true,
    },
  });
}

/**
 * Put times on the table.
 *
 * Does not book anything and does not touch the partner's status: until the
 * applicant picks one of these, there is no meeting, and a status saying
 * otherwise would have the admin screen claiming a call that nobody has
 * agreed to.
 */
export async function offerMeetingSlots(input: {
  meetingId: string;
  slots: Date[];
  durationMinutes: number;
  location?: string | null;
  adminNotes?: string | null;
  scheduledById: string;
}) {
  return db.meeting.update({
    where: { id: input.meetingId },
    data: {
      proposedSlots: input.slots,
      slotsOfferedAt: new Date(),
      durationMinutes: input.durationMinutes,
      location: input.location || null,
      adminNotes: input.adminNotes || null,
      scheduledById: input.scheduledById,
      // Re-offering after a booking would leave a stale time on the card.
      scheduledAt: null,
      confirmedAt: null,
      conferenceUrl: null,
      calendarEventId: null,
    },
  });
}

/**
 * The applicant takes one of the offered times.
 *
 * Rejects anything that is not on the list. The slot arrives from a form, and
 * a form can be posted with any value in it — accepting an arbitrary datetime
 * here would let an applicant book 3am on a Sunday and have the admin screen
 * report it as agreed.
 *
 * The calendar call is deliberately NOT inside the transaction, and is
 * allowed to fail. Today it is a no-op — there is no calendar integration —
 * but the seam is kept, and the rule that goes with it: a third-party round
 * trip holding a database transaction open is how a slow API becomes a
 * lock-wait, and the booking is valid without an external event. The
 * applicant's choice must never be lost to an enrichment that failed.
 */
export async function confirmMeetingSlot(input: {
  meetingId: string;
  slot: Date;
  partnerNote?: string | null;
  summary: string;
  description: string;
  attendeeEmails: string[];
}) {
  const meeting = await db.meeting.findUnique({
    where: { id: input.meetingId },
    select: { id: true, proposedSlots: true, scheduledAt: true, durationMinutes: true },
  });

  if (!meeting) throw new MeetingError("That meeting could not be found.", 404);
  if (meeting.scheduledAt) throw new MeetingError("That call is already booked.", 409);

  const chosen = meeting.proposedSlots.find((s) => s.getTime() === input.slot.getTime());
  if (!chosen) {
    throw new MeetingError("That time is not one of the times offered. Please reload and pick again.", 409);
  }
  if (chosen.getTime() < Date.now()) {
    throw new MeetingError("That time has already passed. Please ask us for new times.", 409);
  }

  const durationMinutes = meeting.durationMinutes ?? 30;

  let eventId: string | null = null;
  let conferenceUrl: string | null = null;
  try {
    const event = await calendar.createEvent({
      summary: input.summary,
      description: input.description,
      start: chosen,
      durationMinutes,
      attendeeEmails: input.attendeeEmails,
      idempotencyKey: `meeting-${meeting.id}`,
    });
    eventId = event.eventId;
    conferenceUrl = event.conferenceUrl;
  } catch {
    /* Swallowed on purpose, and only here. The applicant has chosen a time;
       losing that because Google was slow would be the worse failure, and the
       admin screen shows the missing link plainly enough to act on. */
  }

  return db.meeting.update({
    where: { id: meeting.id },
    data: {
      scheduledAt: chosen,
      confirmedAt: new Date(),
      partnerNote: input.partnerNote || null,
      calendarEventId: eventId,
      conferenceUrl,
    },
  });
}

/**
 * Book a time outright, without offering any.
 *
 * Kept for the case the offer flow does not cover: an admin who has already
 * agreed a time with the applicant on the phone and is recording it. The
 * applicant did not pick it, so `confirmedAt` stays null and their card says
 * so rather than claiming they agreed.
 */
export async function scheduleMeeting(input: {
  meetingId: string;
  scheduledAt: Date;
  durationMinutes: number;
  location?: string | null;
  adminNotes?: string | null;
  scheduledById: string;
}) {
  return db.meeting.update({
    where: { id: input.meetingId },
    data: {
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      location: input.location || null,
      adminNotes: input.adminNotes || null,
      scheduledById: input.scheduledById,
    },
  });
}

export class MeetingError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number
  ) {
    super(message);
    this.name = "MeetingError";
  }
}
