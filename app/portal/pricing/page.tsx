import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularyBrowser } from "@/components/portal/FormularyBrowser";
import { NegotiatedList } from "@/components/portal/NegotiatedList";
import { PortalShell } from "@/components/portal/PortalShell";
import { PricingDecision } from "@/components/portal/PricingDecision";
import { WaitingNotice } from "@/components/portal/WaitingNotice";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { canAccess, currentStepHref, isWaitingOnUs } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import {
  listFormulary,
  listFormularyCategories,
  PAGE_SIZE,
} from "@/lib/services/formulary";
import { getCurrentPriceList } from "@/lib/services/pricing";

export const metadata: Metadata = { title: "Pricing", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PortalPricingPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; mine?: string; page?: string };
}) {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: { id: true, companyName: true, status: true },
  });
  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;

  // A stage cannot be skipped: the same table the tracker draws from decides
  // whether this page opens at all.
  if (!canAccess(status, "pricing")) redirect(currentStepHref(status));

  const negotiated = await getCurrentPriceList(partner.id);
  const showNegotiated = Boolean(negotiated);

  /* The formulary browser is only for the stage where a partner is still
     choosing. Once a negotiated list exists, that list IS the answer, and
     re-offering seven hundred checkboxes beside it would invite someone to
     edit a selection that has already been priced. */
  const query = {
    q: searchParams.q?.trim() || undefined,
    category: searchParams.category || undefined,
    selectedOnly: searchParams.mine === "1",
    page: Number(searchParams.page) || 1,
  };

  const [formulary, categories] = showNegotiated
    ? [null, []]
    : await Promise.all([listFormulary(partner.id, query), listFormularyCategories()]);

  return (
    <PortalShell
      accountName={partner.companyName}
      title={showNegotiated ? "Your pricing" : "Our formulary"}
      eyebrow="Pricing"
      status={status}
      back={{ href: "/portal", label: "Your application" }}
    >
      {showNegotiated ? (
        <>
          <p className="text-intro text-ink-soft text-pretty">
            Built for your practice after our call. Each line shows our list price, the discount
            applied, and what you would pay.
          </p>
          {negotiated!.adminComment && (
            <p className="mt-5 rounded-tile border border-line bg-sand px-4 py-3 text-meta text-ink-soft">
              {negotiated!.adminComment}
            </p>
          )}

          <div className="mt-8">
            <NegotiatedList
              items={negotiated!.items.map((item) => ({
                id: item.id,
                name: item.product.name,
                strength: item.product.strength,
                form: item.product.form,
                listPrice: item.listPrice.toString(),
                discountPercent: item.discountPercent.toString(),
                finalPrice: item.finalPrice.toString(),
              }))}
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-intro text-ink-soft text-pretty">
            Everything we compound. Pick the medications your practice dispenses — we will price
            those, not the whole catalogue. Search, filter, and tick as many as you need.
          </p>

          <div className="mt-8">
            <FormularyBrowser
              rows={formulary!.rows}
              total={formulary!.total}
              page={formulary!.page}
              pageCount={formulary!.pageCount}
              selectedCount={formulary!.selectedCount}
              categories={categories}
              pageSize={PAGE_SIZE}
            />
          </div>
        </>
      )}

      <p className="mt-4 text-caption text-ink-muted">
        All preparations are compounded to prescription. Prices exclude shipping and are held for
        the term of your agreement.
      </p>

      <div className="mt-10">
        {isWaitingOnUs(status) ? (
          <WaitingNotice>
            {status === PARTNER_STATUS.PRICING_CHANGES_REQUESTED
              ? "We are revising your pricing and will send it back shortly."
              : "Nothing is needed from you right now."}
          </WaitingNotice>
        ) : (
          <PricingDecision
            status={status}
            versionId={negotiated?.id ?? null}
            accepted={negotiated?.status === "ACCEPTED"}
            selectedCount={formulary?.selectedCount ?? 0}
          />
        )}
      </div>
    </PortalShell>
  );
}
