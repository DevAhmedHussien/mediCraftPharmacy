import { AmendmentActions } from "@/components/admin/AmendmentActions";
import { MeetingScheduler } from "@/components/admin/MeetingScheduler";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Panel } from "@/components/admin/ui";

/* ===========================================================================
   A verified partner asking for more.

   Mostly read-only. The work this stage needs — pricing the new items — is the
   SAME price-list editor the original negotiation uses, and it already appears
   on this page under its own panel. A second editor here would be a second
   place to get a discount wrong.

   THE ONE THING IT DOES OWN IS THE CALL
   -------------------------------------
   A change order negotiates exactly like a first application: the partner can
   accept the quote, ask for another round, or ask to talk it through. When
   they ask to talk, the slots are offered from here — with the same
   `MeetingScheduler` the first application uses, pointed at a meeting that
   carries this change order's id.

   What it deliberately does not do is move `partner.status`. The partner is
   VERIFIED and filling prescriptions against their existing schedule while
   this conversation happens; that is the entire reason an amendment has a
   lifecycle of its own.
   ========================================================================= */

export type AmendmentView = {
  id: string;
  number: number;
  status: string;
  requestNotes: string;
  requestedAt: string;
  /** What the partner said when asking for a round or a call. */
  partnerNote: string | null;
  items: { product: { id: string; name: string; strength: string | null } }[];
  /** The call about this change order, if one was asked for. */
  meeting: {
    id: string;
    requestNotes: string;
    requestedAt: string;
    proposedSlots: string[];
    scheduledAt: string | null;
    confirmedAt: string | null;
    durationMinutes: number | null;
    location: string | null;
    partnerNote: string | null;
  } | null;
};

export function AmendmentPanel({
  amendment,
  hasDraft,
}: {
  amendment: AmendmentView;
  /** Whether a draft price list is open, so the send button knows. */
  hasDraft: boolean;
}) {
  return (
    <Panel
      title={`Change order ${amendment.number}`}
      description={`Requested ${new Date(amendment.requestedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })} · the partner stays verified and keeps ordering while this runs`}
    >
      <div className="mb-4">
        <StatusBadge kind="amendment" status={amendment.status} />
      </div>

      <blockquote
        className="mb-4 rounded-[5px] border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
        style={{ borderColor: "var(--admin-accent)", background: "var(--status-info-bg)" }}
      >
        {amendment.requestNotes}
      </blockquote>

      <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[color:var(--admin-ink-50)]">
        {amendment.items.length} {amendment.items.length === 1 ? "preparation" : "preparations"}
      </p>
      <ul className="space-y-1">
        {amendment.items.map(({ product }) => (
          <li key={product.id} className="text-[0.8125rem]">
            {product.name}
            {product.strength && (
              <span className="text-[color:var(--admin-ink-50)]"> · {product.strength}</span>
            )}
          </li>
        ))}
      </ul>

      {/* The partner's own words on the quote, kept apart from the original
          request so neither overwrites the other. */}
      {amendment.partnerNote && (
        <div className="mt-4">
          <p className="admin-label mb-1">They said</p>
          <blockquote
            className="rounded-lg border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
            style={{ borderColor: "var(--admin-border-strong)", background: "var(--admin-bg)" }}
          >
            {amendment.partnerNote}
          </blockquote>
        </div>
      )}

      {amendment.meeting?.scheduledAt && (
        <div className="mt-4">
          <p className="admin-label mb-1">
            {amendment.meeting.confirmedAt ? "Call booked by the partner" : "Call booked"}
          </p>
          <p className="text-[0.9375rem] font-bold text-[color:var(--admin-ink)]">
            {new Date(amendment.meeting.scheduledAt).toLocaleString("en-US", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          {amendment.meeting.location && (
            <p className="mt-0.5 text-[0.8125rem] text-[color:var(--admin-ink-70)]">
              {amendment.meeting.location}
            </p>
          )}
        </div>
      )}

      <AmendmentActions
        amendmentId={amendment.id}
        status={amendment.status}
        hasDraft={hasDraft}
      />
    </Panel>
  );
}

/**
 * Offering times for a change-order call.
 *
 * A sibling panel rather than a section inside the one above: the scheduler is
 * already a Panel of its own, and nesting one inside another gave two stacked
 * borders and two titles for one piece of work.
 */
export function AmendmentMeetingPanel({
  amendment,
  partnerId,
}: {
  amendment: AmendmentView;
  partnerId: string;
}) {
  const meeting = amendment.meeting;
  if (!meeting || meeting.scheduledAt) return null;
  if (amendment.status !== "MEETING_REQUESTED") return null;

  return (
    <MeetingScheduler
      partnerId={partnerId}
      meetingId={meeting.id}
      requestNotes={meeting.requestNotes}
      requestedAt={meeting.requestedAt}
      alreadyOffered={meeting.proposedSlots}
    />
  );
}
