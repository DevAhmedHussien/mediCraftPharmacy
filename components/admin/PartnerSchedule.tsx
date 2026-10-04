import { Panel } from "@/components/admin/ui";

/* ===========================================================================
   What this partner pays, for everything they can order.

   THE PAGE DID NOT SHOW THIS. It showed the draft being built, and the price
   list version currently with the applicant — both of which are one
   negotiation's worth of numbers. Neither is the answer to "what does this
   practice pay for tirzepatide today", which for a partner with two signed
   change orders is three documents added together.

   `PartnerPricing` is that sum, and this panel is a plain read of it. It is
   also the only place in the admin where a verified partner's live prices
   appear at all: `StageWork` renders nothing once the pipeline is finished,
   so the moment a partner was activated their pricing went invisible to the
   people answering their questions about it.

   Off-schedule items are not listed. The catalogue is 692 preparations and a
   partner orders a handful; listing the rest as blanks would bury the ones
   that matter.
   ========================================================================= */

export type ScheduleLine = {
  id: string;
  productName: string;
  strength: string | null;
  form: string | null;
  packageSize: string | null;
  unit: string | null;
  listPrice: string;
  price: string;
  deaSchedule: string | null;
  coldChain: boolean;
  effectiveFrom: string | null;
};

const money = (value: string) =>
  Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** List less agreed, as a percentage. Derived so it cannot contradict either. */
function discountOf(listPrice: string, price: string): string | null {
  const list = Number(listPrice);
  const paid = Number(price);
  if (!Number.isFinite(list) || list <= 0 || !Number.isFinite(paid)) return null;
  const off = ((list - paid) / list) * 100;
  if (off <= 0.004) return null;
  return `${off.toFixed(off < 10 ? 1 : 0)}%`;
}

export function PartnerSchedule({ lines }: { lines: ScheduleLine[] }) {
  return (
    <Panel
      title="Their schedule"
      description={
        lines.length === 0
          ? "No live prices on this account."
          : `${lines.length} ${lines.length === 1 ? "preparation" : "preparations"} this partner can order, at the prices in force today.`
      }
    >
      {lines.length === 0 ? (
        <p className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">
          Nothing is priced for this partner yet. Prices are written when they accept a
          quote and switch on when the account is verified — a verified partner with an
          empty schedule here means one of those did not happen.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[5px] border" style={{ borderColor: "var(--admin-border)" }}>
          <table className="w-full min-w-[34rem] border-collapse text-left text-[0.8125rem]">
            <thead>
              <tr style={{ background: "var(--admin-bg)" }}>
                <th className="px-3 py-2 font-semibold text-[color:var(--admin-ink-50)]">
                  Preparation
                </th>
                <th className="px-3 py-2 font-semibold text-[color:var(--admin-ink-50)]">
                  Pack
                </th>
                <th className="px-3 py-2 text-right font-semibold text-[color:var(--admin-ink-50)]">
                  List
                </th>
                <th className="px-3 py-2 text-right font-semibold text-[color:var(--admin-ink-50)]">
                  Off
                </th>
                <th className="px-3 py-2 text-right font-semibold text-[color:var(--admin-ink-50)]">
                  Their price
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const off = discountOf(line.listPrice, line.price);

                return (
                  <tr
                    key={line.id}
                    className="border-t"
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    <td className="px-3 py-2">
                      <span className="block font-semibold text-[color:var(--admin-ink)]">
                        {line.productName}
                      </span>
                      <span className="block text-[0.75rem] text-[color:var(--admin-ink-50)]">
                        {[line.strength, line.form].filter(Boolean).join(" · ") || "—"}
                        {line.deaSchedule && line.deaSchedule !== "NC" && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
                            {line.deaSchedule}
                          </span>
                        )}
                        {line.coldChain && (
                          <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-sky-900">
                            cold chain
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[color:var(--admin-ink-70)]">
                      {line.packageSize ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-ink-70)]">
                      {money(line.listPrice)}
                    </td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-ink-70)]">
                      {off ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-[color:var(--admin-ink)]">
                      {money(line.price)}
                      {line.unit && (
                        <span className="block text-[0.75rem] font-normal text-[color:var(--admin-ink-50)]">
                          per {line.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
