"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { offerMeetingSlotsAction } from "@/app/admin/partners/pricing-actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import { AdminField, AdminSubmit, AdminTextArea } from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";

/**
 * Offer the applicant a choice of times.
 *
 * The applicant's reasons are shown above the form rather than linked from
 * it: they are the only reason this meeting exists, and an admin scheduling
 * blind is the failure this whole stage was designed to prevent.
 *
 * WHY THREE BOXES AND NOT ONE
 * ---------------------------
 * One box meant the admin guessed a time and the applicant — who is in clinic
 * most of the week — either took it or started an email thread that nothing
 * in this system reads. Three offers cost the admin nothing and settle the
 * call in one round trip. Two of the three may be left blank.
 *
 * `suggestions` come from the calendar driver. With Google configured they
 * are real gaps in the diary; with the manual driver they are the next few
 * business mornings and afternoons. Either way they are a starting point the
 * admin can overwrite, never a commitment — nothing is offered until Save.
 */
export function MeetingScheduler({
  partnerId,
  meetingId,
  requestNotes,
  requestedAt,
  suggestions = [],
  knowsAvailability = false,
  alreadyOffered = [],
}: {
  partnerId: string;
  meetingId: string;
  requestNotes: string;
  requestedAt: string;
  /** ISO strings, in the format a datetime-local input takes. */
  suggestions?: string[];
  /** Whether those suggestions actually consulted a diary. */
  knowsAvailability?: boolean;
  /** Times already on the table, if this is a re-offer. */
  alreadyOffered?: string[];
}) {
  const [state, action] = useFormState(
    offerMeetingSlotsAction.bind(null, partnerId, meetingId),
    initialFormState
  );

  const initial = alreadyOffered.length > 0 ? alreadyOffered : [];
  const [slots, setSlots] = useState<string[]>([
    initial[0] ?? suggestions[0] ?? "",
    initial[1] ?? suggestions[1] ?? "",
    initial[2] ?? suggestions[2] ?? "",
  ]);

  const setSlot = (index: number, value: string) =>
    setSlots((current) => current.map((s, i) => (i === index ? value : s)));

  /* Suggestions not already sitting in a box. Offering to fill a box with a
     time that is already in another one is a click that does nothing. */
  const spare = suggestions.filter((s) => !slots.includes(s)).slice(0, 6);

  return (
    <Panel
      title="Offer times for the pricing call"
      description={`Requested ${new Date(requestedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`}
    >
      <blockquote
        className="mb-4 rounded-[5px] border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
        style={{ borderColor: "var(--admin-accent)", background: "#f4f7ff" }}
      >
        {requestNotes}
      </blockquote>

      {alreadyOffered.length > 0 && (
        <AdminAlert ok={false}>
          {alreadyOffered.length} {alreadyOffered.length === 1 ? "time is" : "times are"} already
          offered and waiting on the applicant. Saving replaces them.
        </AdminAlert>
      )}

      <form action={action} className="space-y-4">
        {state.message && <AdminAlert ok={state.ok}>{state.message}</AdminAlert>}

        <div className="space-y-3">
          {slots.map((value, index) => (
            <AdminField
              key={index}
              name="slots"
              label={index === 0 ? "Times to offer" : ""}
              type="datetime-local"
              optional={index > 0}
              value={value}
              onChange={(e) => setSlot(index, e.currentTarget.value)}
              error={index === 0 ? state.errors?.slots : undefined}
              hint={
                index === slots.length - 1
                  ? "The applicant picks one and it books itself. Leave boxes blank to offer fewer."
                  : undefined
              }
            />
          ))}
        </div>

        {spare.length > 0 && (
          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[color:var(--admin-ink-50)]">
              {knowsAvailability ? "Free in your calendar" : "Suggested times"}
            </p>
            <div className="flex flex-wrap gap-2">
              {spare.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    // Fill the first empty box, or replace the last one, so a
                    // second click is never silently ignored.
                    const empty = slots.findIndex((s) => !s);
                    setSlot(empty === -1 ? slots.length - 1 : empty, iso);
                  }}
                  className="rounded-full border px-3 py-1 text-[0.8125rem] transition hover:bg-[#f4f7ff]"
                  style={{ borderColor: "var(--admin-line)" }}
                >
                  {new Date(iso).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </button>
              ))}
            </div>
            {!knowsAvailability && (
              <p className="mt-2 text-[0.75rem] text-[color:var(--admin-ink-50)]">
                Business hours only — nobody&rsquo;s calendar has been checked. Set
                CALENDAR_DRIVER=google to offer real gaps and attach a Meet link.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <AdminField
            name="durationMinutes"
            label="Minutes"
            type="number"
            defaultValue={30}
            optional
          />
          <AdminField
            name="location"
            label="Where"
            optional
            placeholder="Left blank, a Meet link is attached"
            hint="Only needed for a dial-in or an address."
            className="sm:col-span-2"
          />
        </div>

        <AdminTextArea
          name="adminNotes"
          label="Internal notes"
          rows={2}
          optional
          hint="Not shown to the applicant."
        />

        <AdminSubmit>Offer these times</AdminSubmit>
      </form>
    </Panel>
  );
}
