"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { confirmMeetingSlotAction } from "@/app/portal/actions";
import { FormAlert } from "@/components/ui/form/native";
import { fieldClass } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initialFormState } from "@/lib/forms";

/**
 * The applicant picks one of the times MediCraft offered.
 *
 * Radio buttons rather than a date picker, because this is a choice from a
 * short list and not a free entry — the server rejects anything that is not
 * on the list anyway, so a picker would only invite a time it would then
 * refuse.
 *
 * The chosen slot posts as an ISO string. The LABEL is rendered in the
 * browser's own locale, so someone in a different state reads their own
 * wall-clock time rather than ours, and the value that travels is unambiguous
 * either way.
 */
export function MeetingSlotPicker({
  slots,
  durationMinutes,
}: {
  /** ISO strings, earliest first. */
  slots: string[];
  durationMinutes: number;
}) {
  const [state, action] = useFormState(confirmMeetingSlotAction, initialFormState);
  const [chosen, setChosen] = useState<string>(slots[0] ?? "");

  return (
    <div className="mt-6 rounded-tile border border-brand-200 bg-brand-50/50 p-6">
      <p className="eyebrow">Pick a time</p>
      <h2 className="mt-2 text-h4 font-bold text-ink">Your pricing call</h2>
      <p className="mt-2 text-body text-ink-muted">
        These all work our end. Choose whichever suits you and it is booked straight away —
        we will send the joining link by email.
      </p>

      <form action={action} className="mt-5 space-y-4">
        <fieldset className="space-y-2">
          <legend className="sr-only">Times offered</legend>
          {slots.map((iso) => {
            const start = new Date(iso);
            const end = new Date(start.getTime() + durationMinutes * 60_000);
            const picked = chosen === iso;

            return (
              <label
                key={iso}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-tile border p-4 transition",
                  picked ? "border-brand-500 bg-white" : "border-line bg-white/60 hover:border-brand-200",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="slot"
                  value={iso}
                  checked={picked}
                  onChange={() => setChosen(iso)}
                  className="h-4 w-4 accent-brand-600"
                  required
                />
                <span>
                  <span className="block text-[1.0625rem] font-bold text-ink">
                    {start.toLocaleString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="block text-body text-ink-muted">
                    {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {" – "}
                    {end.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div>
          <label htmlFor="partner-note" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Anything we should know before the call?{" "}
            <span className="text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="partner-note"
            name="partnerNote"
            rows={2}
            className={`${fieldClass} mt-1.5`}
            placeholder="Volumes you are planning, products you want to cover…"
          />
        </div>

        <Confirm />
        <FormAlert ok={state.ok} message={state.message} />

        <p className="fine-print">
          None of these work? Reply to the email we sent and we will offer more times.
        </p>
      </form>
    </div>
  );
}

/** Its own component so `useFormStatus` reads THIS form rather than the page. */
function Confirm() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Booking…" : "Book this time"} <span aria-hidden>→</span>
    </Button>
  );
}
