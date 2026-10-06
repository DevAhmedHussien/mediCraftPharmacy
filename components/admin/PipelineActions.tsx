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

   ONE PRIMARY MOVE, ONE CLICK
   ---------------------------
   This used to render every allowed move as an identical secondary button,
   and clicking one did not do it — it revealed a form with a second button
   reading "Confirm: ...". Two clicks and a note field for "Release the
   formulary", which has no decision in it. An admin working a queue could
   not tell which of four equal buttons was the normal path, and the second
   click taught them the first one had not worked.

   So the forward move — the first non-destructive edge, which is the order
   the pipeline table is authored in — is now one primary button that
   submits on click. Everything else is behind "Other moves", closed by
   default.

   WHAT STILL TAKES TWO CLICKS, ON PURPOSE
   ---------------------------------------
   Rejecting and suspending. Those need a reason the partner will read, so
   they open a form, and the extra step is the point: ending somebody's
   application should not be a thing the hand does on the way past.
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
  const [showOthers, setShowOthers] = useState(false);

  // Offered only where both edges are actually available to this admin.
  const canCombine =
    status === PARTNER_STATUS.ONBOARDING_SUBMITTED &&
    moves.some((move) => move.to === PARTNER_STATUS.ONBOARDING_APPROVED);

  if (moves.length === 0) {
    return (
      <Panel title="Nothing to do here">
        <p className="text-[0.8125rem] text-[color:var(--admin-ink-70)]">
          This partner is waiting on their own action, on a signature callback,
          or has reached a final state. The progress cards above say which.
        </p>
      </Panel>
    );
  }

  /* The forward move.
   *
   * The first non-destructive edge, which is the order lib/partner/status.ts
   * authors the table in — the pipeline reads top to bottom, so the first
   * match is the normal path. If a future table is reordered this picks the
   * wrong one, which is why it is derived here and not guessed per status. */
  const primary = canCombine
    ? COMBINED_APPROVE
    : moves.find((m) => !DESTRUCTIVE.includes(m.to)) ?? null;

  const others = moves.filter((m) => m !== primary && m.to !== primary?.to);

  /* A move needing a reason opens a form; everything else submits on click.
     There is no decision inside "Release the formulary", so there is nothing
     for a confirmation step to protect. */
  const primaryNeedsForm = primary ? NEEDS_REASON.includes(primary.to) : false;

  return (
    <Panel
      title="What to do now"
      description="Derived from the state machine and your permissions — these are the only moves this status allows."
    >
      {primary && (
        <div>
          {primaryNeedsForm ? (
            <button
              type="button"
              onClick={() => setSelected(selected?.to === primary.to ? null : primary)}
              className="admin-btn admin-btn-primary"
              aria-pressed={selected?.to === primary.to}
            >
              {primary.label}
            </button>
          ) : (
            <DirectMove partnerId={partnerId} move={primary} combined={primary === COMBINED_APPROVE} />
          )}

          <p className="mt-2.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">
            The partner is emailed and the progress cards above move as soon as this applies.
          </p>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
          <button
            type="button"
            onClick={() => setShowOthers((v) => !v)}
            aria-expanded={showOthers}
            className="admin-btn admin-btn-ghost -ml-2"
          >
            {showOthers ? "Hide other moves" : `Other moves (${others.length})`}
          </button>

          {showOthers && (
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map((move) => (
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
          )}
        </div>
      )}

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

/**
 * A move with nothing to decide: one button, one click, applied.
 *
 * Its own form element so `useFormStatus` reports this button's pending
 * state and not some other form's on the same page.
 */
function DirectMove({
  partnerId,
  move,
  combined,
}: {
  partnerId: string;
  move: Move;
  combined: boolean;
}) {
  const action = combined
    ? approveAndSend.bind(null, partnerId)
    : movePartner.bind(null, partnerId, move.to);
  const [state, formAction] = useFormState(action, initialFormState);

  return (
    <form action={formAction}>
      {state.message && <AdminAlert ok={state.ok}>{state.message}</AdminAlert>}
      <DirectSubmit label={move.label} />
    </form>
  );
}

function DirectSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
      {pending && <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} aria-hidden />}
      {pending ? "Applying…" : label}
    </button>
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
        <p role="alert" className="mt-1.5 text-[0.75rem] font-medium text-[theme(colors.danger.fg)]">
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
