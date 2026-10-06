"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  acceptListPricingAction,
  acceptNegotiatedAction,
  requestAnotherRoundAction,
  requestMeetingAction,
} from "@/app/portal/actions";
import { FormAlert } from "@/components/ui/form/submit";
import { initialFormState } from "@/lib/forms";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/* ===========================================================================
   What the applicant can do with the prices in front of them.

   Which pair of choices they get depends on the stage, and the component
   refuses to guess: each branch is explicit, because "accept" means two
   different things before and after a negotiation (accept list pricing vs
   accept a specific version) and collapsing them would make the second one
   accept whatever version happened to be current at render time.
   ========================================================================= */

function Submit({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "outline" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={tone === "accent" ? "btn-accent btn-lg" : "btn-outline btn-lg"}
    >
      {pending && <Loader2 className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />}
      {pending ? "Sending…" : children}
    </button>
  );
}

export function PricingDecision({
  status,
  versionId,
  accepted,
  selectedCount,
}: {
  status: PartnerStatus;
  versionId: string | null;
  accepted: boolean;
  /** How many medications the partner has ticked. Zero blocks both routes. */
  selectedCount: number;
}) {
  if (accepted) {
    return (
      <p className="flex items-center gap-2.5 rounded-[14px] border border-success-fg/25 bg-success-bg px-4 py-3 text-meta text-success-fg">
        <CheckCircle2 className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
        You accepted this pricing. It is locked to your account.
      </p>
    );
  }

  if (status === PARTNER_STATUS.PRODUCT_LIST_SENT) {
    return <ListPricingChoice selectedCount={selectedCount} />;
  }
  if (status === PARTNER_STATUS.NEGOTIATED_PRICING_SENT && versionId) {
    return <NegotiatedChoice versionId={versionId} />;
  }

  return null;
}

/** Before any negotiation: accept as-is, or ask for a call. */
function ListPricingChoice({ selectedCount }: { selectedCount: number }) {
  const [showRequest, setShowRequest] = useState(false);
  const [acceptState, accept] = useFormState(acceptListPricingAction, initialFormState);
  const [requestState, request] = useFormState(requestMeetingAction, initialFormState);

  /* Both routes price the selection, so neither means anything without one.
     The server refuses an empty selection as well — this is the explanation,
     not the gate. */
  if (selectedCount === 0) {
    return (
      <div className="rounded-card border border-dashed border-hair-strong p-6">
        <h2 className="text-[1.0625rem] font-bold text-ink">Choose your medications first</h2>
        <p className="mt-2 max-w-prose text-meta text-ink-soft">
          Tick the preparations your practice dispenses in the list above. We price what you
          select rather than the whole formulary, so this is the one thing we need before either
          accepting our list pricing or booking a call.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-hair-soft p-6">
      <h2 className="text-[1.0625rem] font-bold text-ink">How would you like to proceed?</h2>
      <p className="mt-1.5 text-caption text-ink-muted">
        Based on the{" "}
        <strong className="font-semibold text-ink">
          {selectedCount} {selectedCount === 1 ? "medication" : "medications"}
        </strong>{" "}
        you selected.
      </p>

      {acceptState.message && <FormAlert ok={acceptState.ok} message={acceptState.message} />}

      {!showRequest ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <form action={accept}>
            <Submit>Accept list pricing for these</Submit>
          </form>
          <button
            type="button"
            onClick={() => setShowRequest(true)}
            className="btn-outline btn-lg"
          >
            Negotiate these prices
          </button>
        </div>
      ) : (
        <form action={request} className="mt-5">
          {requestState.message && (
            <FormAlert ok={requestState.ok} message={requestState.message} />
          )}

          <label htmlFor="requestNotes" className="block text-meta font-medium text-ink">
            What would you like to discuss?
          </label>
          <p className="mt-1 text-caption text-ink-muted">
            We will price the {selectedCount} {selectedCount === 1 ? "medication" : "medications"}{" "}
            you selected. Tell us about volumes or which of them matter most — it saves the first
            ten minutes of the call.
          </p>
          <textarea
            id="requestNotes"
            name="requestNotes"
            rows={4}
            required
            aria-invalid={Boolean(requestState.errors?.requestNotes)}
            className="mt-3 w-full rounded-[14px] border border-hair bg-white px-3 py-2 text-meta text-ink placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="We dispense around 40 GLP-1 vials a month and would like to discuss tiered pricing at that volume."
          />
          {requestState.errors?.requestNotes && (
            <p role="alert" className="mt-1.5 text-caption font-medium text-danger-fg">
              {requestState.errors.requestNotes}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Submit>Send request</Submit>
            <button
              type="button"
              onClick={() => setShowRequest(false)}
              className="text-meta font-medium text-ink-soft hover:text-brand-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** After the call: accept this version, or ask for another round. */
function NegotiatedChoice({ versionId }: { versionId: string }) {
  const [showRound, setShowRound] = useState(false);
  const [acceptState, accept] = useFormState(
    acceptNegotiatedAction.bind(null, versionId),
    initialFormState
  );
  const [roundState, round] = useFormState(
    requestAnotherRoundAction.bind(null, versionId),
    initialFormState
  );

  return (
    <div className="rounded-card border border-hair-soft p-6">
      <h2 className="text-[1.0625rem] font-bold text-ink">Does this work?</h2>
      <p className="mt-1 text-caption text-ink-muted">
        Accepting locks these prices to your account for the term of your agreement.
      </p>

      {acceptState.message && <FormAlert ok={acceptState.ok} message={acceptState.message} />}

      {!showRound ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <form action={accept}>
            <Submit>Accept these prices</Submit>
          </form>
          <button type="button" onClick={() => setShowRound(true)} className="btn-outline btn-lg">
            Ask for another round
          </button>
        </div>
      ) : (
        <form action={round} className="mt-5">
          {roundState.message && <FormAlert ok={roundState.ok} message={roundState.message} />}

          <label htmlFor="note" className="block text-meta font-medium text-ink">
            What still does not work?
          </label>
          <textarea
            id="note"
            name="note"
            rows={4}
            required
            aria-invalid={Boolean(roundState.errors?.note)}
            className="mt-3 w-full rounded-[14px] border border-hair bg-white px-3 py-2 text-meta text-ink placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="The semaglutide lines work, but the peptide pricing is still above what we pay today."
          />
          {roundState.errors?.note && (
            <p role="alert" className="mt-1.5 text-caption font-medium text-danger-fg">
              {roundState.errors.note}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Submit tone="outline">Send to the team</Submit>
            <button
              type="button"
              onClick={() => setShowRound(false)}
              className="text-meta font-medium text-ink-soft hover:text-brand-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
