"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, FileSignature, Pencil, Send, X } from "lucide-react";

import {
  acceptAmendmentAction,
  declineAmendmentAction,
  sendAmendmentPricingAction,
  sendChangeOrderAction,
} from "@/app/admin/partners/amendment-actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import { initialFormState } from "@/lib/forms";

/* ===========================================================================
   What an admin can actually DO with a change order.

   This is the piece that was missing. The panel above it has always described
   a change order and told the admin to "build their prices in the price list
   editor below" — but `StageWork` renders nothing for a VERIFIED partner, so
   there was no editor below and no button anywhere. Every service behind this
   file existed and had no caller.

   The moves, in the order they come up:

     REQUESTED          Accept it (opens a draft priced to its items) or decline.
     UNDER_REVIEW       Send the prices once the draft is built.
     CHANGES_REQUESTED  Same, for the next round.
     MEETING_SCHEDULED  Same, for the revised quote after the call.
     ACCEPTED           Issue the change order for signature.

   MEETING_REQUESTED is absent on purpose: that one is answered by offering
   times, which is its own panel.

   THE SECOND ROUND USED TO BE A DEAD END
   --------------------------------------
   "Accept and price it" — the only button that opens a draft — rendered at
   REQUESTED and nowhere else. The moment the first quote went out the draft
   became SENT, so a partner asking for another round left the admin looking
   at "No draft is open. Accept the request to open one priced to its items."
   above a disabled Send button, with no way anywhere on the page to open one.
   The same hole swallowed the revised quote after a pricing call.

   A change order that reaches CHANGES_REQUESTED or MEETING_SCHEDULED
   therefore gets its own button for the next round's draft. `startDraft`
   returns the open draft if there is one and carries the previous round's
   discounts forward, so pressing it twice is harmless and the second round
   starts from the first rather than from zero.
   ========================================================================= */

export function AmendmentActions({
  amendmentId,
  status,
  hasDraft,
}: {
  amendmentId: string;
  status: string;
  /** Whether a draft price list is already open for this partner. */
  hasDraft: boolean;
}) {
  const [declining, setDeclining] = useState(false);

  const [sendState, sendAction] = useFormState(
    sendAmendmentPricingAction.bind(null, amendmentId),
    initialFormState
  );
  const [declineState, declineAction] = useFormState(
    declineAmendmentAction.bind(null, amendmentId),
    initialFormState
  );
  const [orderState, orderAction] = useFormState(
    sendChangeOrderAction.bind(null, amendmentId),
    initialFormState
  );

  const canPrice =
    status === "UNDER_REVIEW" ||
    status === "CHANGES_REQUESTED" ||
    status === "MEETING_SCHEDULED";

  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
      {status === "REQUESTED" && (
        <div className="flex flex-wrap items-center gap-2">
          <form action={acceptAmendmentAction.bind(null, amendmentId)}>
            <Submit idle="Accept and price it" busy="Opening…" icon={<Check className="size-3.5" strokeWidth={2.4} aria-hidden />} />
          </form>
          <button
            type="button"
            onClick={() => setDeclining((v) => !v)}
            aria-expanded={declining}
            className="admin-btn admin-btn-danger"
          >
            <X className="size-3.5" strokeWidth={2.4} aria-hidden />
            Decline
          </button>
        </div>
      )}

      {canPrice && !hasDraft && (
        <div>
          <p className="mb-3 text-[0.8125rem] text-[color:var(--admin-ink-70)]">
            {status === "MEETING_SCHEDULED"
              ? "The call is booked. Open a draft to build the revised prices."
              : status === "CHANGES_REQUESTED"
                ? "They have asked for another round. Open a draft to revise the prices — last round's discounts carry over."
                : "Open a draft priced to the preparations they asked for."}
          </p>
          <form action={acceptAmendmentAction.bind(null, amendmentId)}>
            <Submit
              idle="Open the pricing draft"
              busy="Opening…"
              icon={<Pencil className="size-3.5" strokeWidth={2.2} aria-hidden />}
            />
          </form>
        </div>
      )}

      {canPrice && hasDraft && (
        <form action={sendAction} className="space-y-3">
          <p className="text-[0.8125rem] text-[color:var(--admin-ink-70)]">
            Set the discounts in the price list editor below, then send them.
          </p>
          <textarea
            name="adminComment"
            rows={2}
            className="admin-input"
            placeholder="A note to send with the prices (optional)"
          />
          <Submit
            idle="Send these prices"
            busy="Sending…"
            icon={<Send className="size-3.5" strokeWidth={2.2} aria-hidden />}
          />
          <AdminAlertIf state={sendState} />
        </form>
      )}

      {status === "ACCEPTED" && (
        <form action={orderAction}>
          <p className="mb-3 text-[0.8125rem] text-[color:var(--admin-ink-70)]">
            The partner has agreed these prices. Issuing the change order sends Exhibit B —
            the preparations and the Provider Cost they accepted — for signature. The new
            preparations go live the moment it is signed.
          </p>
          <Submit
            idle="Issue the change order"
            busy="Issuing…"
            icon={<FileSignature className="size-3.5" strokeWidth={2.2} aria-hidden />}
          />
          <AdminAlertIf state={orderState} />
        </form>
      )}

      {declining && (
        <form action={declineAction} className="mt-3 space-y-2">
          <label htmlFor={`decline-${amendmentId}`} className="admin-label mb-1 block">
            Why are you declining?
          </label>
          <textarea
            id={`decline-${amendmentId}`}
            name="reason"
            rows={2}
            required
            className="admin-input"
            placeholder="The partner reads this."
          />
          {declineState.errors?.reason && (
            <p role="alert" className="text-[0.75rem] font-medium text-[#9c3a2a]">
              {declineState.errors.reason}
            </p>
          )}
          <Submit idle="Decline this change order" busy="Declining…" danger />
          <AdminAlertIf state={declineState} />
        </form>
      )}
    </div>
  );
}

function AdminAlertIf({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message) return null;
  return <AdminAlert ok={state.ok}>{state.message}</AdminAlert>;
}

function Submit({
  idle,
  busy,
  icon,
  danger,
  disabled,
}: {
  idle: string;
  busy: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={danger ? "admin-btn admin-btn-danger" : "admin-btn admin-btn-primary"}
    >
      {!pending && icon}
      {pending ? busy : idle}
    </button>
  );
}
