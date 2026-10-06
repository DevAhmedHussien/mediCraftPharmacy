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
 * WHAT CHANGED, AND WHY
 * ---------------------
 * THE RED BANNER WAS NOT AN ERROR. "Three times are already offered. Saving
 * replaces them" is a standing fact, not a failure, and it was rendered in
 * the failure red with `role="alert"`. It is a notice now.
 *
 * IT WAS ALSO SAID TWICE. After a successful save the panel showed both the
 * result ("3 times offered. The applicant has been emailed to pick one.") and
 * the standing notice, which say the same thing. The notice is suppressed
 * while a result is on screen.
 *
 * THE BOXES HAD NO LABELS. Only the first carried "Times to offer"; the other
 * two were given an empty string, which rendered an empty <label> with a
 * stray "(optional)" floating under the input and left a screen reader to
 * announce two of the three fields as nothing at all. They are a fieldset
 * with a legend and one real label each.
 *
 * NO CALENDAR INTEGRATION. The suggestion chips and the "free in your
 * calendar" affordance are gone along with the Google driver. The admin types
 * the times they want.
 */
export function MeetingScheduler({
  partnerId,
  meetingId,
  requestNotes,
  requestedAt,
  alreadyOffered = [],
}: {
  partnerId: string;
  meetingId: string;
  requestNotes: string;
  requestedAt: string;
  /** Times already on the table, if this is a re-offer. */
  alreadyOffered?: string[];
}) {
  const [state, action] = useFormState(
    offerMeetingSlotsAction.bind(null, partnerId, meetingId),
    initialFormState
  );

  const [slots, setSlots] = useState<string[]>([
    alreadyOffered[0] ?? "",
    alreadyOffered[1] ?? "",
    alreadyOffered[2] ?? "",
  ]);

  const setSlot = (index: number, value: string) =>
    setSlots((current) => current.map((s, i) => (i === index ? value : s)));

  const offered = alreadyOffered.length;

  return (
    <Panel
      title="Offer times for the pricing call"
      description={`Requested ${new Date(requestedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`}
    >
      <blockquote
        className="mb-4 rounded-lg border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
        style={{ borderColor: "var(--admin-accent)", background: "var(--status-info-bg)" }}
      >
        {requestNotes}
      </blockquote>

      {/* The result of the last save wins. Showing both it and the standing
          notice repeats the same fact in two colours. */}
      {state.message ? (
        <AdminAlert ok={state.ok}>{state.message}</AdminAlert>
      ) : (
        offered > 0 && (
          <AdminAlert tone="info">
            {offered === 1
              ? "One time is already offered and waiting on the applicant."
              : `${offered} times are already offered and waiting on the applicant.`}{" "}
            Saving replaces them.
          </AdminAlert>
        )
      )}

      <form action={action} className="space-y-5">
        <fieldset>
          <legend className="admin-label mb-1 block">Times to offer</legend>
          <p className="mb-2.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">
            The applicant picks one and it books itself. Leave the second and
            third blank to offer fewer.
          </p>

          <div className="space-y-3">
            {slots.map((value, index) => (
              <AdminField
                key={index}
                name="slots"
                label={ORDINALS[index]}
                type="datetime-local"
                /* Only the first is required: the point of the other two is
                   that they may be left empty. */
                optional={index > 0}
                value={value}
                onChange={(e) => setSlot(index, e.currentTarget.value)}
                error={index === 0 ? state.errors?.slots : undefined}
              />
            ))}
          </div>
        </fieldset>

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
            placeholder="Phone, video link or address"
            hint="Sent to the applicant with the confirmation."
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

        <AdminSubmit>{offered > 0 ? "Replace these times" : "Offer these times"}</AdminSubmit>
      </form>
    </Panel>
  );
}

/** Each box says which choice it is, so no field is announced as nothing. */
const ORDINALS = ["First choice", "Second choice", "Third choice"] as const;
