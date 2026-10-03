import { Panel, Pill, type Tone } from "@/components/admin/ui";

/* ===========================================================================
   A verified partner asking for more.

   Read-only on purpose, for now. The work this stage needs — pricing the new
   items — is the SAME price-list editor the original negotiation uses, and it
   already appears on this page under its own panel. A second editor here
   would be a second place to get a discount wrong.

   What this panel does is the thing nothing else on the page can: say that a
   verified partner is waiting, say what for, and say in their own words why.
   Without it the request exists only as a notification that scrolls away.
   ========================================================================= */

const TONE: Record<string, Tone> = {
  REQUESTED: "warn",
  UNDER_REVIEW: "info",
  PRICING_SENT: "info",
  CHANGES_REQUESTED: "warn",
  ACCEPTED: "info",
  CHANGE_ORDER_SENT: "info",
  SIGNED: "good",
  DECLINED: "bad",
};

const LABEL: Record<string, string> = {
  REQUESTED: "Needs pricing",
  UNDER_REVIEW: "Being priced",
  PRICING_SENT: "With the partner",
  CHANGES_REQUESTED: "Another round asked for",
  ACCEPTED: "Prices agreed — send the change order",
  CHANGE_ORDER_SENT: "Out for signature",
  SIGNED: "Signed",
  DECLINED: "Declined",
};

export type AmendmentView = {
  id: string;
  number: number;
  status: string;
  requestNotes: string;
  requestedAt: string;
  items: { product: { id: string; name: string; strength: string | null } }[];
};

export function AmendmentPanel({ amendment }: { amendment: AmendmentView }) {
  return (
    <Panel
      title={`Change order ${amendment.number}`}
      description={`Requested ${new Date(amendment.requestedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })} · the partner stays verified and keeps ordering while this runs`}
    >
      <div className="mb-4">
        <Pill tone={TONE[amendment.status] ?? "info"}>
          {LABEL[amendment.status] ?? amendment.status}
        </Pill>
      </div>

      <blockquote
        className="mb-4 rounded-[5px] border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
        style={{ borderColor: "var(--admin-accent)", background: "#f4f7ff" }}
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

      {amendment.status === "REQUESTED" && (
        <p className="mt-4 text-[0.75rem] text-[color:var(--admin-ink-50)]">
          Build their prices in the price list editor below, then send it as you would any
          other round. These items go live only once the change order is signed.
        </p>
      )}
    </Panel>
  );
}
