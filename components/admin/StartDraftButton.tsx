import { startDraftAction } from "@/app/admin/partners/pricing-actions";
import { EmptyState, Panel } from "@/components/admin/ui";

/**
 * Opens a draft seeded from the live catalog at zero discount.
 *
 * A form posting to a server action rather than a button with an onClick, so
 * this stays a server component and the permission is re-checked server-side.
 *
 * `revision` changes the copy, not the behaviour: after an applicant asks for
 * another round there IS a previous list, and telling the admin "no pricing
 * drafted yet" reads as though their work was lost. `startDraft` carries the
 * previous round's discounts forward either way.
 */
export function StartDraftButton({
  partnerId,
  revision = false,
  applicantNote,
}: {
  partnerId: string;
  revision?: boolean;
  /** What the applicant said was wrong with the last round. */
  applicantNote?: string | null;
}) {
  return (
    <Panel title={revision ? "Revise the pricing" : "Negotiated pricing"}>
      {revision && applicantNote && (
        <blockquote
          className="mb-4 rounded-r-[14px] border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
          style={{ borderColor: "var(--admin-accent)", background: "var(--status-info-bg)" }}
        >
          {applicantNote}
        </blockquote>
      )}

      <EmptyState
        title={revision ? "Open a revision" : "No pricing drafted yet"}
        description={
          revision
            ? "A new version opens with the previous round's discounts already in place, so you adjust what changed rather than starting over."
            : "A draft opens seeded with every active product at zero discount."
        }
      />

      <form action={startDraftAction.bind(null, partnerId)} className="mt-3">
        <button type="submit" className="admin-btn admin-btn-primary">
          {revision ? "Open a revision" : "Start a pricing draft"}
        </button>
      </form>
    </Panel>
  );
}
