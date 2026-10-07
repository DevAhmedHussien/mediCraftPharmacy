import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";

import { AgreementSigner } from "@/components/portal/AgreementSigner";
import { PortalShell } from "@/components/portal/PortalShell";
import { signChangeOrderAction } from "@/app/portal/actions";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import {
  buildChangeOrderText,
  getSignableChangeOrder,
} from "@/lib/services/amendments";
import { internalDisclosure, signature } from "@/lib/services/signature";

export const metadata: Metadata = {
  title: "Change order",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const money = (value: string) =>
  Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ===========================================================================
   Signing Exhibit B.

   The last step of adding medications, and it is deliberately the same shape
   as the last step of applying: read the document, tick that you have read
   it, type your name. Same signature box, same disclosure, same hash check —
   see `AgreementSigner`.

   WHY IT IS NOT /portal/agreement
   -------------------------------
   That page is the MSA, gated on the application pipeline reaching MSA_SENT.
   A verified partner opening it was told their agreement had not been issued
   yet, because by its reckoning it had been issued and signed months ago.
   Bending it to mean two documents at two points in a partner's life would
   have made every branch on it ask which one it was talking about.

   WHAT THE PARTNER IS NOT ASKED TO DO AGAIN: prove who they are, re-upload a
   licence, or re-sign the MSA. We hold all of that. A change order adds
   preparations to an agreement that is already in force, and §16.3 of that
   agreement is the authority for doing it this way.
   ========================================================================= */

export default async function ChangeOrderSigningPage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: { id: true, companyName: true, status: true },
  });
  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;
  // Only a verified partner has a schedule to add to. Anybody earlier is
  // still negotiating their first one, on the pricing page.
  if (status !== PARTNER_STATUS.VERIFIED) redirect("/portal");

  const order = await getSignableChangeOrder(partner.id);
  // Nothing out for signature. The schedule page says where the request
  // actually is, which is more use than an empty signing screen.
  if (!order) redirect("/portal/products");

  const text = await buildChangeOrderText(order.id);
  if (!text) redirect("/portal/products");

  return (
    <PortalShell
      accountName={partner.companyName}
      title={`Change order ${order.number}`}
      eyebrow="Agreement"
      status={status}
      back={{ href: "/portal/products", label: "Your medications" }}
    >
      <p className="text-intro text-ink-soft text-pretty">
        This adds the preparations below to your schedule at the prices you accepted. Nothing
        already on your schedule changes, and the rest of your Master Service Agreement is
        untouched — this is the Change Order form it refers to in Section 16.3.
      </p>

      <section className="mt-8">
        <h2 className="text-h4 font-bold text-ink">
          <FileSignature className="mr-2 inline size-4 align-[-2px]" aria-hidden />
          What you are adding
        </h2>

        <div
          tabIndex={0}
          role="region"
          aria-label="Change order lines"
          className="mt-4 overflow-x-auto rounded-tile border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-sand">
                <th className="px-4 py-3 text-caption font-bold uppercase tracking-wide text-ink-muted">
                  Preparation
                </th>
                <th className="px-4 py-3 text-right text-caption font-bold uppercase tracking-wide text-ink-muted">
                  List
                </th>
                <th className="px-4 py-3 text-right text-caption font-bold uppercase tracking-wide text-ink-muted">
                  Discount
                </th>
                <th className="px-4 py-3 text-right text-caption font-bold uppercase tracking-wide text-ink-muted">
                  Your price
                </th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.name} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <span className="block font-bold text-ink">{line.name}</span>
                    <span className="block text-caption text-ink-muted">
                      {[line.strength, line.form, line.packageSize]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-meta text-ink-soft">
                    {money(line.listPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-meta text-ink-soft">
                    {Number(line.discountPercent) > 0 ? `${line.discountPercent}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-ink">
                    {money(line.finalPrice)}
                    {line.unit && (
                      <span className="block text-caption font-normal text-ink-muted">
                        per {line.unit}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* The document itself, in the words that get hashed. `whitespace-pre-wrap`
          for the same reason the MSA page uses it: the line breaks are the
          layout, and a Markdown pass would reflow the clauses. */}
      <article
        className="mt-8 max-h-[28rem] overflow-y-auto rounded-tile border border-line bg-sand p-6 text-meta leading-relaxed text-ink-soft"
        tabIndex={0}
        aria-label="Change order text"
      >
        <pre className="whitespace-pre-wrap font-sans">{text}</pre>
      </article>

      <div className="mt-8">
        <AgreementSigner
          disclosure={internalDisclosure(`change order ${order.number}`, "Sign change order")}
          driver={signature.name}
          action={signChangeOrderAction}
          heading={`Sign change order ${order.number}`}
          consent={`I have read change order ${order.number} above and I am authorised to sign it on behalf of my practice.`}
          submitLabel="Sign change order"
        />
      </div>
    </PortalShell>
  );
}
