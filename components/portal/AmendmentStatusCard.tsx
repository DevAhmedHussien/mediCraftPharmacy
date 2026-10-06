"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CalendarClock, Check, MessageSquare } from "lucide-react";

import {
  acceptAmendmentPricingAction,
  confirmAmendmentSlotAction,
  requestAmendmentCallAction,
  requestAmendmentRoundAction,
} from "@/app/portal/products/actions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Panel } from "@/components/admin/ui";
import { FormAlert } from "@/components/ui/form/native";
import { initialFormState } from "@/lib/forms";

export type QuotedLine = {
  name: string;
  strength: string | null;
  form: string | null;
  unit: string | null;
  listPrice: string;
  discountPercent: string;
  finalPrice: string;
};

type Amendment = {
  id: string;
  number: number;
  status: string;
  requestNotes: string;
  requestedAt: string;
  adminNote: string | null;
  items: { product: { id: string; name: string; strength: string | null } }[];
  /** The quoted prices, once an admin has sent them. Empty before that. */
  lines: QuotedLine[];
  /** The call about this change order, once one has been asked for. */
  meeting?: {
    proposedSlots: string[];
    scheduledAt: string | null;
    durationMinutes: number | null;
    location: string | null;
    conferenceUrl: string | null;
  } | null;
};

/* ===========================================================================
   A change order, from the partner's side.

   WHY THERE ARE NOW THREE ANSWERS AND NOT ONE
   -------------------------------------------
   Until now a quoted change order offered exactly one button: Accept. A
   verified partner who thought a price was wrong had to send an email, and
   nothing in this system read emails — so the request sat in PRICING_SENT
   looking like it was waiting on them.

   The first application has always offered three answers to a quote: take it,
   ask for another round, or ask to talk it through. A change order is the same
   negotiation with the same stakes, so it offers the same three. What it does
   NOT repeat is the identity check, the documents and the account details —
   we already hold those, which is the whole advantage of already being a
   partner.
   ========================================================================= */

const EXPLANATION: Record<string, string> = {
  REQUESTED: "We have your request. Someone will price these and come back to you.",
  UNDER_REVIEW: "We are pricing these for you now.",
  PRICING_SENT:
    "Your pricing for these items is ready. Accept it, ask for another round, or ask to talk it through.",
  CHANGES_REQUESTED: "You asked for another look. We are revising these prices.",
  MEETING_REQUESTED:
    "We have your request for a call. We will send you a few times to choose from shortly.",
  MEETING_SCHEDULED: "Your call is booked. We will send revised pricing after it.",
  ACCEPTED: "Pricing agreed. Your change order is being prepared.",
  CHANGE_ORDER_SENT:
    "Your change order is ready to sign. These items go live the moment it is signed.",
};

/**
 * The same ten states, in the partner's language.
 *
 * The shared vocabulary is written from the admin's side — "needs pricing",
 * "being priced" — because the console is where it is read most. A partner
 * reading "needs pricing" about their own request would reasonably wonder
 * what they were supposed to do about it, so the labels are overridden here.
 * The tone is not: the colour means the same thing on both sides of the
 * conversation, which is the point of having one vocabulary.
 */
const PARTNER_LABEL: Record<string, string> = {
  REQUESTED: "With us",
  UNDER_REVIEW: "Being priced",
  PRICING_SENT: "Your prices are ready",
  CHANGES_REQUESTED: "Being revised",
  MEETING_REQUESTED: "Call asked for",
  MEETING_SCHEDULED: "Call booked",
  ACCEPTED: "Prices agreed",
  CHANGE_ORDER_SENT: "Ready to sign",
  SIGNED: "Signed",
  DECLINED: "Not taken forward",
};

export function AmendmentStatusCard({ amendment }: { amendment: Amendment }) {
  /* Which of the three answers the partner is giving. `null` means they have
     not chosen yet, so the two that need a reason stay collapsed rather than
     putting two textareas on screen before either is wanted. */
  const [answer, setAnswer] = useState<"round" | "call" | null>(null);

  const [acceptState, acceptAction] = useFormState(
    acceptAmendmentPricingAction.bind(null, amendment.id),
    initialFormState
  );
  const [roundState, roundAction] = useFormState(
    requestAmendmentRoundAction.bind(null, amendment.id),
    initialFormState
  );
  const [callState, callAction] = useFormState(
    requestAmendmentCallAction.bind(null, amendment.id),
    initialFormState
  );
  const [slotState, slotAction] = useFormState(
    confirmAmendmentSlotAction.bind(null, amendment.id),
    initialFormState
  );

  const meeting = amendment.meeting;
  // Offered and not yet taken — the same pair of columns the first
  // application reads to tell the two halves of an offer apart.
  const awaitingPick =
    !!meeting && !meeting.scheduledAt && meeting.proposedSlots.length > 0;

  return (
    <div className="dashboard mt-4">
      <Panel
        title={`Change order ${amendment.number}`}
        description={EXPLANATION[amendment.status] ?? "This request is in progress."}
      >
        {/* The partner's own wording for the same fact — "we are pricing
            these" rather than the admin's "being priced". Same badge, same
            tone, same vocabulary; only the sentence is theirs. */}
        <StatusBadge kind="amendment" status={amendment.status} label={PARTNER_LABEL[amendment.status]} />

        <ChangeOrderSteps status={amendment.status} />

        {/* Before a quote exists there are no prices to show, so the request
            is listed as the partner wrote it. Afterwards the priced table
            replaces it — the same items, with the numbers they are being
            asked to agree to. */}
        {amendment.lines.length === 0 ? (
          <ul className="mt-4 space-y-1">
            {amendment.items.map(({ product }) => (
              <li key={product.id} className="text-[0.8125rem] text-[color:var(--admin-ink-70)]">
                {product.name}
                {product.strength ? ` · ${product.strength}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--admin-border)" }}>
            <table className="w-full min-w-[26rem] border-collapse text-left text-[0.8125rem]">
              <thead>
                <tr style={{ background: "var(--admin-bg)" }}>
                  <th className="px-3 py-2 font-semibold text-[color:var(--admin-ink-50)]">
                    Preparation
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[color:var(--admin-ink-50)]">
                    List
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[color:var(--admin-ink-50)]">
                    Off
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[color:var(--admin-ink-50)]">
                    Your price
                  </th>
                </tr>
              </thead>
              <tbody>
                {amendment.lines.map((line) => (
                  <tr key={line.name} className="border-t" style={{ borderColor: "var(--admin-border)" }}>
                    <td className="px-3 py-2">
                      <span className="block font-semibold text-[color:var(--admin-ink)]">
                        {line.name}
                      </span>
                      <span className="block text-[0.75rem] text-[color:var(--admin-ink-50)]">
                        {[line.strength, line.form].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-ink-70)]">
                      {money(line.listPrice)}
                    </td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-ink-70)]">
                      {Number(line.discountPercent) > 0 ? `${line.discountPercent}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-[color:var(--admin-ink)]">
                      {money(line.finalPrice)}
                      {line.unit && (
                        <span className="block text-[0.75rem] font-normal text-[color:var(--admin-ink-50)]">
                          per {line.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {amendment.adminNote && (
          <p
            className="mt-4 rounded-r-[14px] border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
            style={{ borderColor: "var(--admin-accent)", background: "var(--status-info-bg)" }}
          >
            {amendment.adminNote}
          </p>
        )}

        {/* ---- Three answers to a quote ---- */}
        {amendment.status === "PRICING_SENT" && (
          <div className="mt-5 space-y-3">
            <p className="text-[0.8125rem] text-[color:var(--admin-ink-70)]">
              These are the prices above. Accepting them starts your change order; nothing
              on your current schedule changes either way.
            </p>

            <div className="flex flex-wrap gap-2">
              <form action={acceptAction}>
                <Accept />
              </form>
              <button
                type="button"
                onClick={() => setAnswer(answer === "round" ? null : "round")}
                aria-expanded={answer === "round"}
                className="admin-btn admin-btn-secondary"
              >
                <MessageSquare className="size-3.5" strokeWidth={2} aria-hidden />
                Ask for another round
              </button>
              <button
                type="button"
                onClick={() => setAnswer(answer === "call" ? null : "call")}
                aria-expanded={answer === "call"}
                className="admin-btn admin-btn-secondary"
              >
                <CalendarClock className="size-3.5" strokeWidth={2} aria-hidden />
                Ask for a call
              </button>
            </div>

            <FormAlert ok={acceptState.ok} message={acceptState.message} />

            {answer === "round" && (
              <form action={roundAction} className="space-y-2 pt-1">
                <label
                  htmlFor={`round-${amendment.id}`}
                  className="admin-label mb-1 block"
                >
                  What does not work?
                </label>
                <textarea
                  id={`round-${amendment.id}`}
                  name="note"
                  rows={3}
                  required
                  className="admin-input"
                  placeholder="Which items, and what you were expecting."
                />
                {roundState.errors?.note && (
                  <p role="alert" className="text-[0.75rem] font-medium text-[theme(colors.danger.fg)]">
                    {roundState.errors.note}
                  </p>
                )}
                <Submit idle="Send for another round" busy="Sending…" />
                <FormAlert ok={roundState.ok} message={roundState.message} />
              </form>
            )}

            {answer === "call" && (
              <form action={callAction} className="space-y-2 pt-1">
                <label htmlFor={`call-${amendment.id}`} className="admin-label mb-1 block">
                  What would you like to cover?
                </label>
                <textarea
                  id={`call-${amendment.id}`}
                  name="notes"
                  rows={3}
                  required
                  className="admin-input"
                  placeholder="So the first ten minutes are not spent working out what the call is for."
                />
                {callState.errors?.notes && (
                  <p role="alert" className="text-[0.75rem] font-medium text-[theme(colors.danger.fg)]">
                    {callState.errors.notes}
                  </p>
                )}
                <Submit idle="Ask for a call" busy="Asking…" />
                <FormAlert ok={callState.ok} message={callState.message} />
              </form>
            )}
          </div>
        )}

        {/* ---- Times on the table ---- */}
        {awaitingPick && (
          <form action={slotAction} className="mt-5 space-y-3">
            <p className="admin-label">Pick a time</p>
            <ul className="space-y-2">
              {meeting!.proposedSlots.map((slot, index) => (
                <li key={slot}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-[0.8125rem] transition-colors hover:bg-[color:var(--admin-bg)]"
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={slot}
                      defaultChecked={index === 0}
                      required
                      className="mt-0.5"
                    />
                    <span className="font-medium text-[color:var(--admin-ink)]">
                      {new Date(slot).toLocaleString("en-US", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <textarea
              name="partnerNote"
              rows={2}
              className="admin-input"
              placeholder="Anything to add before the call (optional)"
            />
            <Submit idle="Book this time" busy="Booking…" />
            <FormAlert ok={slotState.ok} message={slotState.message} />
          </form>
        )}

        {/* ---- Booked ---- */}
        {meeting?.scheduledAt && amendment.status === "MEETING_SCHEDULED" && (
          <div className="mt-5">
            <p className="admin-label">Your call</p>
            <p className="mt-1 text-[1.0625rem] font-bold text-[color:var(--admin-ink)]">
              {new Date(meeting.scheduledAt).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
            {meeting.location && (
              <p className="mt-1 text-[0.8125rem] text-[color:var(--admin-ink-70)]">
                {meeting.location}
              </p>
            )}
            {meeting.durationMinutes && (
              <p className="mt-1 text-[0.75rem] text-[color:var(--admin-ink-50)]">
                About {meeting.durationMinutes} minutes.
              </p>
            )}
          </div>
        )}

        {amendment.status === "CHANGE_ORDER_SENT" && (
          <p className="mt-5">
            <a
              href="/portal/agreement/change-order"
              className="font-semibold"
              style={{ color: "var(--admin-accent)" }}
            >
              Review and sign change order {amendment.number} →
            </a>
          </p>
        )}
      </Panel>
    </div>
  );
}

function Accept() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
      <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
      {pending ? "Accepting…" : "Accept these prices"}
    </button>
  );
}

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
      {pending ? busy : idle}
    </button>
  );
}

const money = (value: string) =>
  Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ===========================================================================
   The change order's own progress rail.

   The first application has a nine-step tracker across the top of every
   screen, and a partner who has been through it knows exactly what it means.
   A change order is the same journey with the identity, documents and account
   details already behind them, so it gets the same rail cut down to the five
   stops that are left — rather than a status word they have to translate.

   Deliberately not `StepTracker`: that one is driven by `PartnerStatus` and a
   change order never touches it. Sharing the component would have meant
   teaching the application's step table about a lifecycle that runs beside it.
   ========================================================================= */

const CHANGE_ORDER_STEPS = ["Request", "Pricing", "Agreed", "Signature", "Live"] as const;

/** Which stop a change order is standing on. */
const STEP_OF: Record<string, number> = {
  REQUESTED: 0,
  UNDER_REVIEW: 0,
  PRICING_SENT: 1,
  CHANGES_REQUESTED: 1,
  MEETING_REQUESTED: 1,
  MEETING_SCHEDULED: 1,
  ACCEPTED: 2,
  CHANGE_ORDER_SENT: 3,
  SIGNED: 4,
};

function ChangeOrderSteps({ status }: { status: string }) {
  const current = STEP_OF[status] ?? 0;

  return (
    <nav aria-label="Change order progress" className="mt-4">
      <ol className="flex gap-0">
        {CHANGE_ORDER_STEPS.map((label, index) => {
          const done = index < current;
          const here = index === current;

          return (
            <li
              key={label}
              aria-current={here ? "step" : undefined}
              className="min-w-0 flex-1"
            >
              <span className="flex items-center">
                <span
                  aria-hidden
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.625rem] font-bold"
                  style={{
                    borderColor:
                      done || here ? "var(--admin-accent)" : "var(--admin-border-strong)",
                    background: done ? "var(--admin-accent)" : "#fff",
                    color: done
                      ? "#fff"
                      : here
                        ? "var(--admin-accent)"
                        : "var(--admin-ink-50)",
                  }}
                >
                  {done ? "✓" : index + 1}
                </span>
                {index < CHANGE_ORDER_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="h-px w-full min-w-2 flex-1"
                    style={{
                      background: done ? "var(--admin-accent)" : "var(--admin-border)",
                    }}
                  />
                )}
              </span>
              <span
                className="mt-1.5 block pr-2 text-[0.6875rem] font-bold leading-tight"
                style={{
                  color: here
                    ? "var(--admin-accent)"
                    : done
                      ? "var(--admin-ink)"
                      : "var(--admin-ink-50)",
                }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
