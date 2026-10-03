import "server-only";

import { createSign } from "node:crypto";

import { env } from "@/lib/env";

/* ===========================================================================
   Calendar and video, behind a driver.

   Two implementations of one interface, the same arrangement as
   lib/services/signature.ts and for the same reason: the booking flow has to
   be complete and testable before anyone has put a Google service account in
   front of it.

     MANUAL — live by default. No free/busy, and the "conference link" is
              whatever the admin typed into the `location` field. The booking
              flow works end to end; it just does not know anything about
              anyone's diary.
     GOOGLE — a real calendar event with a Meet link minted by Google, and
              free/busy used to keep the admin from offering a time they are
              already booked for.

   WHY NO `googleapis` DEPENDENCY
   -----------------------------
   The whole of what we need is two REST calls and an RS256 JWT. `googleapis`
   is a ~50 MB dependency that would be pulled into a Next server bundle to
   save about forty lines, and it brings its own auth caching, retry and
   logging opinions into a codebase that already has its own.

   WHAT GOOGLE REQUIRES, STATED PLAINLY
   ------------------------------------
   A bare service account can own a calendar, but it CANNOT mint a Meet link:
   Google issues conference data for a Workspace user, not for a robot. So the
   Google driver signs its JWT with a `sub` — `GOOGLE_CALENDAR_SUBJECT`, the
   Workspace user the service account impersonates through domain-wide
   delegation. Without that subject the driver still creates events; it just
   returns a null conference URL, and the admin's typed link is used instead.
   That is a documented degradation rather than a silent one — `createEvent`
   says which it did.
   ========================================================================= */

export type CalendarSlot = { start: Date; end: Date };

export type CalendarEventRequest = {
  summary: string;
  description: string;
  start: Date;
  durationMinutes: number;
  /** Everyone who should get the invitation. */
  attendeeEmails: string[];
  /** Ties the Meet request to this booking so a retry cannot mint two. */
  idempotencyKey: string;
};

export type CalendarEventResult = {
  eventId: string | null;
  /** Null when no Meet link could be minted — see the note above. */
  conferenceUrl: string | null;
};

export type CalendarDriverApi = {
  name: "MANUAL" | "GOOGLE";
  /** Whether this driver can answer `busyWindows` at all. */
  readonly knowsAvailability: boolean;
  /** Windows already taken, inside the range asked for. */
  busyWindows(range: { from: Date; to: Date }): Promise<CalendarSlot[]>;
  createEvent(request: CalendarEventRequest): Promise<CalendarEventResult>;
  cancelEvent(eventId: string): Promise<void>;
};

/* --- Manual --------------------------------------------------------------- */

const manualDriver: CalendarDriverApi = {
  name: "MANUAL",
  knowsAvailability: false,

  async busyWindows() {
    // Not "no one is busy" — "this driver does not know". The caller reads
    // `knowsAvailability` before asking, so an empty array here is never
    // mistaken for a clear diary.
    return [];
  },

  async createEvent() {
    return { eventId: null, conferenceUrl: null };
  },

  async cancelEvent() {
    /* Nothing was created, so nothing is cancelled. */
  },
};

/* --- Google --------------------------------------------------------------- */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

export class CalendarError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number
  ) {
    super(message);
    this.name = "CalendarError";
  }
}

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Access token, cached until shortly before it expires.
 *
 * Google's tokens last an hour. Minting a fresh one per request costs a round
 * trip on every admin page load that shows suggested times, and the signing
 * is the expensive half.
 */
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !key) {
    throw new CalendarError(
      "CALENDAR_DRIVER=google needs GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY. " +
        "Set CALENDAR_DRIVER=manual to book without a calendar.",
      500
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims: Record<string, string | number> = {
    iss: email,
    scope: SCOPES,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  // Domain-wide delegation. Without it Google will not issue conference data.
  if (env.GOOGLE_CALENDAR_SUBJECT) claims.sub = env.GOOGLE_CALENDAR_SUBJECT;

  const body = base64url(JSON.stringify(claims));
  // The key arrives from the environment with literal \n, as every Google
  // service-account JSON does once it has been through a .env file.
  const pem = key.replace(/\\n/g, "\n");
  const signature = base64url(createSign("RSA-SHA256").update(`${header}.${body}`).sign(pem));

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${body}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new CalendarError(
      `Google refused the service-account assertion (${response.status}). ` +
        `Check the key, and that ${email} has domain-wide delegation for ${SCOPES}.`,
      502
    );
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function googleFetch(path: string, init: RequestInit) {
  const token = await accessToken();
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new CalendarError(
      `Google Calendar returned ${response.status} for ${path}. ${detail.slice(0, 300)}`,
      502
    );
  }

  return response.json();
}

const googleDriver: CalendarDriverApi = {
  name: "GOOGLE",
  knowsAvailability: true,

  async busyWindows({ from, to }) {
    const json = (await googleFetch("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        timeZone: env.CALENDAR_TIMEZONE,
        items: [{ id: env.GOOGLE_CALENDAR_ID }],
      }),
    })) as {
      calendars: Record<string, { busy?: { start: string; end: string }[] }>;
    };

    const busy = json.calendars?.[env.GOOGLE_CALENDAR_ID]?.busy ?? [];
    return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  },

  async createEvent({ summary, description, start, durationMinutes, attendeeEmails, idempotencyKey }) {
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    const json = (await googleFetch(
      `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events` +
        `?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        body: JSON.stringify({
          summary,
          description,
          start: { dateTime: start.toISOString(), timeZone: env.CALENDAR_TIMEZONE },
          end: { dateTime: end.toISOString(), timeZone: env.CALENDAR_TIMEZONE },
          attendees: attendeeEmails.map((email) => ({ email })),
          conferenceData: {
            createRequest: {
              // Google dedupes on this, so a double-submitted form cannot
              // produce two Meet rooms for one call.
              requestId: idempotencyKey,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    )) as {
      id: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
    };

    const entry = json.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");

    return { eventId: json.id, conferenceUrl: json.hangoutLink ?? entry?.uri ?? null };
  },

  async cancelEvent(eventId) {
    await googleFetch(
      `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}` +
        `?sendUpdates=all`,
      { method: "DELETE" }
    ).catch(() => {
      /* A cancelled booking whose event was already gone is not an error
         worth failing the request over — the booking is cancelled either
         way, and the alternative is an admin unable to undo anything. */
    });
  },
};

/* --- Selection ------------------------------------------------------------ */

const DRIVERS: Record<string, CalendarDriverApi> = {
  manual: manualDriver,
  google: googleDriver,
};

export const calendar: CalendarDriverApi = DRIVERS[env.CALENDAR_DRIVER] ?? manualDriver;

/* --- Suggesting times ----------------------------------------------------- */

/**
 * Candidate slots for the admin to choose from.
 *
 * Business hours only, on business days, skipping anything that collides with
 * a busy window. With the manual driver this is simply "the next few business
 * mornings and afternoons" — still useful, because the job it does is saving
 * an admin from typing three datetimes by hand, not pretending to know a
 * diary it cannot see.
 */
export async function suggestSlots({
  from = new Date(),
  days = 7,
  durationMinutes = 30,
  hours = [10, 14, 16],
  limit = 9,
}: {
  from?: Date;
  days?: number;
  durationMinutes?: number;
  hours?: number[];
  limit?: number;
} = {}): Promise<CalendarSlot[]> {
  const to = new Date(from.getTime() + days * 86_400_000);
  const busy = calendar.knowsAvailability ? await calendar.busyWindows({ from, to }) : [];

  const out: CalendarSlot[] = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);

  for (let d = 0; d < days && out.length < limit; d += 1) {
    const cursor = new Date(day.getTime() + d * 86_400_000);
    const weekday = cursor.getDay();
    if (weekday === 0 || weekday === 6) continue;

    for (const hour of hours) {
      if (out.length >= limit) break;
      const start = new Date(cursor);
      start.setHours(hour, 0, 0, 0);
      // A slot has to be far enough out that the applicant can actually read
      // the email before it starts.
      if (start.getTime() < from.getTime() + 2 * 3_600_000) continue;

      const end = new Date(start.getTime() + durationMinutes * 60_000);
      const clashes = busy.some((b) => start < b.end && end > b.start);
      if (!clashes) out.push({ start, end });
    }
  }

  return out;
}

/**
 * A `Date` as a `datetime-local` input value, in the configured zone.
 *
 * `toISOString().slice(0, 16)` is the obvious version and it is wrong: it
 * renders UTC, so an admin in Florida is offered times three, four or five
 * hours off depending on the month. Formatting through `Intl` in
 * CALENDAR_TIMEZONE makes the server and the applicant's email agree on what
 * "2:00 PM" means, which is the only way the two can be compared at all.
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
