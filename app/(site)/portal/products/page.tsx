import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, Pill } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { AmendmentRequest } from "@/components/portal/AmendmentRequest";
import { AmendmentStatusCard } from "@/components/portal/AmendmentStatusCard";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { getOpenAmendment, listAmendments } from "@/lib/services/amendments";

export const metadata: Metadata = {
  title: "Your medications",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const money = (value: string) =>
  Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ===========================================================================
   What you order from us, and what you signed for it.

   The two belong on one page because they answer one question. A partner
   asking "can I order this, and at what price" is asking about the schedule;
   a partner asking "what did we agree" is asking about the agreement that put
   it there. Splitting them meant the price was in one place and its authority
   in another.

   ONLY FOR VERIFIED PARTNERS. Before verification the pricing page is the
   right screen — the schedule is still being negotiated there, and showing a
   second view of unagreed prices invites someone to order against them.
   ========================================================================= */

export default async function PortalProductsPage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      companyName: true,
      status: true,
      application: { select: { practiceName: true } },
      pricing: {
        where: { isActive: true },
        orderBy: { product: { name: "asc" } },
        select: {
          price: true,
          effectiveFrom: true,
          product: {
            select: {
              id: true,
              name: true,
              strength: true,
              form: true,
              packageSize: true,
              unit: true,
              deaSchedule: true,
            },
          },
        },
      },
      /* Every executed agreement, newest first: the original MSA and each
         signed change order after it. A partner with three change orders has
         four documents, and "which one covers this price" is answerable only
         if all four are listed. */
      msaEnvelopes: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: {
          id: true,
          completedAt: true,
          signedName: true,
          driver: true,
          amendments: { select: { number: true }, take: 1 },
        },
      },
    },
  });

  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;
  if (status !== PARTNER_STATUS.VERIFIED) redirect("/portal");

  const [open, history] = await Promise.all([
    getOpenAmendment(partner.id),
    listAmendments(partner.id),
  ]);

  /* The catalogue minus what they already have.
   *
   * Fetched only when there is no open request, because that is the only time
   * the picker renders — and it is 692 rows. Offering items already on their
   * schedule would get them rejected by `requestAmendment` with a message
   * nobody needed to read. */
  const available = open
    ? []
    : (
        await db.product.findMany({
          where: {
            isActive: true,
            NOT: { partnerPricing: { some: { partnerId: partner.id, isActive: true } } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            strength: true,
            form: true,
            isQuoteOnly: true,
            category: { select: { name: true } },
          },
        })
      ).map((p) => ({
        id: p.id,
        name: p.name,
        strength: p.strength,
        form: p.form,
        isQuoteOnly: p.isQuoteOnly,
        category: p.category?.name ?? null,
      }));

  const name = partner.application?.practiceName ?? partner.companyName;
  const settled = history.filter((a) => a.status === "SIGNED" || a.status === "DECLINED");

  return (
    <PortalShell
      accountName={name}
      title="Your medications"
      eyebrow="Formulary"
      status={status}
      back={{ href: "/portal/welcome", label: "Back to your account" }}
    >
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-h4 font-bold text-ink">
            <Pill className="mr-2 inline size-4 align-[-2px]" aria-hidden />
            On your schedule
          </h2>
          <p className="text-caption text-ink-muted">
            {partner.pricing.length} {partner.pricing.length === 1 ? "preparation" : "preparations"}
          </p>
        </div>

        {partner.pricing.length === 0 ? (
          <p className="mt-4 rounded-tile border border-line bg-sand p-5 text-body text-ink-muted">
            Nothing is on your schedule yet. If that looks wrong, get in touch — it should
            have been set when your account was verified.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-tile border border-line">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-sand">
                  <th className="px-4 py-3 text-caption font-bold uppercase tracking-wide text-ink-muted">
                    Preparation
                  </th>
                  <th className="px-4 py-3 text-caption font-bold uppercase tracking-wide text-ink-muted">
                    Pack
                  </th>
                  <th className="px-4 py-3 text-right text-caption font-bold uppercase tracking-wide text-ink-muted">
                    Your price
                  </th>
                </tr>
              </thead>
              <tbody>
                {partner.pricing.map((row) => (
                  <tr key={row.product.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="block font-bold text-ink">{row.product.name}</span>
                      <span className="block text-caption text-ink-muted">
                        {[row.product.strength, row.product.form].filter(Boolean).join(" · ")}
                        {row.product.deaSchedule && row.product.deaSchedule !== "NC" && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
                            {row.product.deaSchedule}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-meta text-ink-soft">
                      {row.product.packageSize ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ink">
                      {money(row.price.toString())}
                      <span className="block text-caption font-normal text-ink-muted">
                        per {row.product.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-h4 font-bold text-ink">
          <FileText className="mr-2 inline size-4 align-[-2px]" aria-hidden />
          Agreements you have signed
        </h2>

        <ul className="mt-4 space-y-3">
          {partner.msaEnvelopes.map((envelope) => {
            const amendment = envelope.amendments[0];
            return (
              <li
                key={envelope.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-line bg-sand px-5 py-4"
              >
                <div>
                  <p className="font-bold text-ink">
                    {amendment
                      ? `Change order ${amendment.number}`
                      : "Master Service Agreement"}
                  </p>
                  <p className="text-caption text-ink-muted">
                    Signed by {envelope.signedName ?? "—"}
                    {envelope.completedAt &&
                      ` on ${envelope.completedAt.toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}`}
                  </p>
                </div>
                <a
                  href={`/api/agreement/${partner.id}?envelope=${envelope.id}`}
                  className="link-arrow font-semibold"
                >
                  Download PDF
                </a>
              </li>
            );
          })}
          {partner.msaEnvelopes.length === 0 && (
            <li className="rounded-tile border border-line bg-sand px-5 py-4 text-body text-ink-muted">
              No signed agreement on file yet.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-h4 font-bold text-ink">Need something else?</h2>

        {open ? (
          <AmendmentStatusCard amendment={{ ...open, requestedAt: open.requestedAt.toISOString() }} />
        ) : (
          <AmendmentRequest products={available} />
        )}

        {settled.length > 0 && (
          <ul className="mt-6 space-y-2">
            {settled.map((a) => (
              <li key={a.id} className="text-caption text-ink-muted">
                Change order {a.number} ·{" "}
                {a.status === "SIGNED" ? "added to your schedule" : "not taken forward"} ·{" "}
                {a.items.length} {a.items.length === 1 ? "item" : "items"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  );
}
