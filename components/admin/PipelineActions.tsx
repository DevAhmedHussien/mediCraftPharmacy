"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { approveAndSend, movePartner } from "@/app/admin/partners/actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import { Panel } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/* ===========================================================================
   The moves an admin can make from here.

   The button list comes from the state machine, filtered by the permissions
   this admin actually holds — there is no hard-coded list of actions in this
   component, so an edge added to lib/partner/status.ts appears here and an
   edge removed disappears. The server re-derives and re-checks all of it
   anyway; this is the affordance, not the control.
   ========================================================================= */

type Move = { to: PartnerStatus; label: string; permission: string | null };

/**
 * A move that is really two, offered as one button.
 *
 * Approving an onboarding file and sending the agreement are separate edges
 * with separate audit rows, but there is no decision between them — so the
 * primary button does both, and the plain "Onboarding approved" move stays in
 * the list for a reviewer who genuinely wants to stop there.
 */
const COMBINED_APPROVE: Move = {
  to: PARTNER_STATUS.ONBOARDING_APPROVED,
  label: "Approve and send agreement",
  permission: null,
};

/** Moves that end something. Styled apart and always require a reason. */
const DESTRUCTIVE: PartnerStatus[] = [
  PARTNER_STATUS.REJECTED,
  PARTNER_STATUS.SUSPENDED,
  PARTNER_STATUS.MSA_DECLINED,
];

const NEEDS_REASON: PartnerStatus[] = [PARTNER_STATUS.REJECTED, PARTNER_STATUS.SUSPENDED];

export function PipelineActions({
  partnerId,
  moves,
  status,
}: {
  partnerId: string;
  moves: Move[];
  status: PartnerStatus;
}) {
  const [selected, setSelected] = useState<Move | null>(null);

  // Offered only where both edges are actually available to this admin.
  const canCombine =
    status === PARTNER_STATUS.ONBOARDING_SUBMITTED &&
    moves.some((move) => move.to === PARTNER_STATUS.ONBOARDING_APPROVED);

  if (moves.length === 0) {
    return (
      <Panel title="Next step">
        <p className="text-[0.8125rem] text-[color:var(--admin-ink-70)]">
          Nothing to do here — this partner is waiting on their own action, on a
          signature callback, or has reached a final state.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Next step"
      description="Only the moves this status allows, and only the ones your permissions cover."
    >
      <div className="flex flex-wrap gap-2">
        {canCombine && (
          <button
            type="button"
            onClick={() =>
              setSelected(selected?.label === COMBINED_APPROVE.label ? null : COMBINED_APPROVE)
            }
            className="admin-btn admin-btn-primary"
            aria-pressed={selected?.label === COMBINED_APPROVE.label}
          >
            {COMBINED_APPROVE.label}
          </button>
        )}

        {moves.map((move) => (
          <button
            key={move.to}
            type="button"
            onClick={() => setSelected(selected?.to === move.to ? null : move)}
            className={
              DESTRUCTIVE.includes(move.to)
                ? "admin-btn admin-btn-danger"
                : "admin-btn admin-btn-secondary"
            }
            aria-pressed={selected?.to === move.to}
          >
            {move.label}
          </button>
        ))}
      </div>

      {selected && (
        <MoveForm
          key={selected.label}
          partnerId={partnerId}
          move={selected}
          onDone={() => setSelected(null)}
        />
      )}
    </Panel>
  );
}

function MoveForm({
  partnerId,
  move,
  onDone,
}: {
  partnerId: string;
  move: Move;
  onDone: () => void;
}) {
  const combined = move.label === COMBINED_APPROVE.label;
  const action = combined
    ? approveAndSend.bind(null, partnerId)
    : movePartner.bind(null, partnerId, move.to);
  const [state, formAction] = useFormState(action, initialFormState);

  const reasonRequired = NEEDS_REASON.includes(move.to);

  return (
    <form
      action={formAction}
      className="mt-4 border-t pt-4"
      style={{ borderColor: "var(--admin-border)" }}
    >
      {state.message && <AdminAlert ok={state.ok}>{state.message}</AdminAlert>}

      <label htmlFor={`note-${move.label}`} className="admin-label block">
        {reasonRequired ? "Reason (required)" : "Note (optional)"}
      </label>
      <textarea
        id={`note-${move.label}`}
        name="note"
        rows={2}
        required={reasonRequired}
        aria-invalid={Boolean(state.errors?.note)}
        placeholder={
          reasonRequired
            ? "Shown to the partner in their email and kept on the record."
            : "Appears on the timeline."
        }
        className="admin-input mt-1.5"
      />
      {state.errors?.note && (
        <p role="alert" className="mt-1.5 text-[0.75rem] font-medium text-[#9c3a2a]">
          {state.errors.note}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Confirm label={move.label} />
        <button
          type="button"
          onClick={onDone}
          className="admin-btn admin-btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Confirm({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
      {pending && <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} aria-hidden />}
      {pending ? "Applying…" : `Confirm: ${label}`}
    </button>
  );
}
