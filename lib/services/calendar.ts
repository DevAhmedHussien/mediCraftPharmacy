import "server-only";

import { env } from "@/lib/env";

/* ===========================================================================
   Meeting times.

   NO CALENDAR INTEGRATION, ON PURPOSE
   -----------------------------------
   This file used to carry a Google Calendar driver: a hand-rolled RS256 JWT,
   OAuth token exchange, free/busy queries to suggest open slots, and Meet
   link minting via domain-wide delegation. It was opt-in behind
   CALENDAR_DRIVER=google and never switched on. It has been removed at the
   owner's direction — the pharmacy does not want its diary connected to this
   application.

   What that costs, stated plainly, so nobody re-adds it by accident thinking
   something is broken:

     • The admin types the times they want to offer. Nothing proposes times,
       because nothing can see a calendar.
     • No invitation lands in anybody's calendar app. The confirmation email
       carries the time, and whoever wants it in their diary puts it there.
     • There is no video link unless an admin types one into "Where".

   A booking is still a real, recorded thing: the chosen time, duration and
   location live on the `Meeting` row, which is what the portal and the
   confirmation email read.

   `createEvent` is kept as a seam rather than deleted outright. It is the one
   call `meetings.ts` makes, and leaving the shape in place means connecting a
   calendar later is implementing one function instead of unpicking the
   booking flow.
   ========================================================================= */

export type CalendarEventRequest = {
  summary: string;
  description: string;
  start: Date;
  durationMinutes: number;
  attendeeEmails: string[];
  /** Ties a retry to the same booking, for any driver that needs it. */
  idempotencyKey: string;
};

export type CalendarEventResult = {
  /** Null here: nothing external was created. */
  eventId: string | null;
  /** Null here: no video link is minted. */
  conferenceUrl: string | null;
};

export type CalendarDriverApi = {
  name: "MANUAL";
  createEvent(request: CalendarEventRequest): Promise<CalendarEventResult>;
  cancelEvent(eventId: string): Promise<void>;
};

export const calendar: CalendarDriverApi = {
  name: "MANUAL",

  async createEvent() {
    // The booking is the database row. Nothing is created elsewhere, so there
    // is no id to hand back and no link to attach.
    return { eventId: null, conferenceUrl: null };
  },

  async cancelEvent() {
    /* Nothing was created, so nothing is cancelled. */
  },
};

/**
 * A `Date` as a `datetime-local` input value, in the pharmacy's timezone.
 *
 * Kept even with no calendar driver: the admin's three time boxes are
 * `datetime-local` inputs, which take `YYYY-MM-DDTHH:mm` and interpret it in
 * the *browser's* zone. An admin working from another state must see and type
 * the pharmacy's local time, or an offered slot means two different instants
 * depending on who opened the page.
 */
export function localInputValue(date: Date, timeZone = env.CALENDAR_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  // en-CA gives 24-hour time, but renders midnight as "24" rather than "00".
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * The inverse of `localInputValue`: a `datetime-local` string → the instant it
 * names in the pharmacy's timezone.
 *
 * WHY THIS HAS TO EXIST
 * ---------------------
 * `new Date("2026-10-07T09:00")` is not a fixed point in time. A date-time
 * string carrying no offset is parsed as LOCAL time, and "local" means the
 * zone of whatever machine runs the code — the server's. So an admin typing
 * 9:00 AM produced 09:00 UTC on a UTC host (5:00 AM in Florida), and a
 * different instant again on a host set to anything else. The offered time
 * drifted with the deployment.
 *
 * `CALENDAR_TIMEZONE` existed for exactly this and was only ever read on the
 * way out, to render a stored instant back into a box. Both directions have to
 * use it or the round trip does not close.
 *
 * HOW
 * ---
 * There is no parse-in-zone primitive in JS. The reliable trick is to read the
 * wall-clock numbers as if they were UTC, ask what offset the target zone had
 * at roughly that moment, and subtract it. The second pass matters only on the
 * two days a year a DST change lands between the guess and the answer.
 */
export function fromLocalInputValue(
  value: string,
  timeZone = env.CALENDAR_TIMEZONE
): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return new Date(NaN);

  const [, y, mo, d, h, mi] = match.map(Number) as unknown as number[];
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);

  const offsetAt = (instant: number): number => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(new Date(instant))
        .map((p) => [p.type, p.value])
    ) as Record<string, string>;

    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      // en-US with hour12:false renders midnight as "24".
      parts.hour === "24" ? 0 : Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return asUtc - instant;
  };

  const first = offsetAt(wallAsUtc);
  const candidate = wallAsUtc - first;
  const second = offsetAt(candidate);

  return new Date(second === first ? candidate : wallAsUtc - second);
}
