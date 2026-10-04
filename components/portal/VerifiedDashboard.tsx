import Link from "next/link";
import { ArrowRight, FileText, PlusCircle } from "lucide-react";

import { AgreementViewer } from "@/components/portal/AgreementViewer";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Cell,
  DataTable,
  EmptyState,
  Facts,
  Panel,
  Row,
  StatStrip,
} from "@/components/admin/ui";

/* ===========================================================================
   What a verified partner sees.

   Until now, reaching VERIFIED ended the portal: the status card said "You are
   a verified MediCraft partner. Everything below is live", and below it was a
   box offering the support email. The agreement they had just signed, the
   prices they had just negotiated, the date any of it happened, and the way to
   ask for more medications were all either unreachable or on pages with no
   link pointing at them.

   THE COMPONENTS ARE THE ADMIN'S
   ------------------------------
   Panel, StatStrip, DataTable, Facts and Pill are imported from
   components/admin/ui — not copied. The partner's dashboard and the admin's
   console are the same furniture, so a change to a panel's padding or a
   badge's tone lands in both and neither can drift.

   Those components are written against the `--admin-*` custom properties,
   which used to be defined only under `.admin`. They are now defined for
   `.dashboard` too, which is the wrapper below — that is the whole of what it
   took to share them.

   WHAT IT DELIBERATELY DOES NOT DO
   --------------------------------
   It does not show a price list the partner cannot act on, and it does not
   invent an "orders" section. Ordering happens by prescription, not in this
   portal, and a dashboard that implies otherwise would be lying about the
   product.
   ========================================================================= */

export type DashboardAmendment = {
  id: string;
  number: number;
  status: string;
  requestedAt: Date;
  itemCount: number;
};

export type DashboardPriceLine = {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  unit: string | null;
  finalPrice: string;
};

const AMENDMENT_SAYS: Record<string, string> = {
  REQUESTED: "We have your request and will come back to you shortly.",
  UNDER_REVIEW: "A pharmacist is pricing the medications you asked for.",
  PRICING_SENT: "Your prices are ready — review and accept them.",
  CHANGES_REQUESTED: "You asked for another round — we are revising these prices.",
  MEETING_REQUESTED: "You asked for a call. We will send you times to choose from shortly.",
  MEETING_SCHEDULED: "Your call is booked. Revised pricing follows it.",
  ACCEPTED: "Accepted. Your change order is being prepared for signature.",
  CHANGE_ORDER_SENT: "Your change order is ready to sign.",
  SIGNED: "Signed. The new medications are on your price list.",
  DECLINED: "This request was declined.",
};

/**
 * The one thing, if any, that is waiting on the partner.
 *
 * Returns null for every state where the ball is in our court — which is most
 * of them. A banner that renders on every visit saying "your request is being
 * priced" is furniture; one that appears only when a signature is missing is
 * the reason the page gets read.
 */
function nextMove(
  amendment: DashboardAmendment | null
): { title: string; detail: string; href: string; cta: string } | null {
  if (!amendment) return null;

  if (amendment.status === "CHANGE_ORDER_SENT") {
    return {
      title: `Change order ${amendment.number} is waiting for your signature`,
      detail: `The ${amendment.itemCount} ${
        amendment.itemCount === 1 ? "medication goes" : "medications go"
      } live on your schedule the moment it is signed.`,
      href: "/portal/agreement/change-order",
      cta: "Review and sign it",
    };
  }

  if (amendment.status === "PRICING_SENT") {
    return {
      title: `Your prices for change order ${amendment.number} are ready`,
      detail: "Accept them, ask for another round, or ask to talk them through.",
      href: "/portal/products",
      cta: "Review the prices",
    };
  }

  return null;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function VerifiedDashboard({
  partnerId,
  companyName,
  verifiedAt,
  signedAt,
  signedName,
  priceListVersion,
  priceLines,
  totalPriced,
  openAmendment,
}: {
  partnerId: string;
  companyName: string;
  verifiedAt: Date | null;
  signedAt: Date | null;
  signedName: string | null;
  priceListVersion: number | null;
  /** A short preview; the full list lives on /portal/pricing. */
  priceLines: DashboardPriceLine[];
  totalPriced: number;
  openAmendment: DashboardAmendment | null;
}) {
  /* What, if anything, the partner has to do. Null nine visits out of ten —
     which is why it is worth interrupting the page for on the tenth. */
  const waiting = nextMove(openAmendment);

  return (
    /* `dashboard` supplies the tokens the admin components are built on. */
    <div className="dashboard mt-10 space-y-5">
      <StatStrip
        stats={[
          { label: "Status", value: "Verified", detail: "Prescriptions accepted" },
          { label: "Verified on", value: formatDate(verifiedAt) },
          { label: "Agreement signed", value: formatDate(signedAt) },
          {
            label: "Medications priced",
            value: totalPriced,
            detail: priceListVersion ? `Exhibit A-1, version ${priceListVersion}` : undefined,
          },
        ]}
      />

      {/* The one thing that needs them, when there is one.
          A verified partner's dashboard is otherwise all reference, so a
          change order waiting on a signature has to interrupt it rather than
          sit four panels down in the section about adding medications —
          which is where it was, under a heading that reads as optional. */}
      {waiting && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--admin-card-radius)] px-6 py-5"
          style={{ background: "#fdf8ee", border: "1px solid #e8cf9a" }}
        >
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-bold text-[#8a6416]">{waiting.title}</p>
            <p className="mt-0.5 text-[0.8125rem] text-[#8a6416]">{waiting.detail}</p>
          </div>
          <Link href={waiting.href} className="admin-btn admin-btn-primary shrink-0">
            {waiting.cta}
            <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      )}

      {/* ---- What they pay ----
          Before the agreement, not after it. A verified partner opens this
          page to check a price far more often than to re-read the contract,
          and the contract was sitting on top of the thing they came for. */}
      <Panel
        title="Your price list"
        description={
          priceListVersion
            ? `The prices you accepted. These are the rates on your account today.`
            : "No price list is attached to this account yet."
        }
      >
        {priceLines.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No medications priced yet"
            description="Once a price list is agreed, it appears here."
          />
        ) : (
          <>
            <DataTable head={["Medication", "Strength", "Form", "Your price"]}>
              {priceLines.map((line) => (
                <Row key={line.id}>
                  <Cell className="font-semibold text-[color:var(--admin-ink)]">
                    {line.name}
                  </Cell>
                  <Cell>{line.strength ?? "—"}</Cell>
                  <Cell>{line.form ?? "—"}</Cell>
                  <Cell numeric>
                    ${line.finalPrice}
                    {line.unit ? (
                      <span className="text-[color:var(--admin-ink-50)]"> /{line.unit}</span>
                    ) : null}
                  </Cell>
                </Row>
              ))}
            </DataTable>

            {totalPriced > priceLines.length && (
              <p className="mt-4 text-[0.8125rem] text-[color:var(--admin-ink-50)]">
                Showing {priceLines.length} of {totalPriced}.{" "}
                <Link
                  href="/portal/pricing"
                  className="font-semibold"
                  style={{ color: "var(--admin-accent)" }}
                >
                  See the full list
                </Link>
              </p>
            )}
          </>
        )}
      </Panel>

      {/* ---- The agreement they signed ---- */}
      <Panel
        title="Your agreement"
        description="The Master Service Agreement you signed, with your agreed prices as Exhibit A-1."
      >
        <Facts
          rows={[
            ["Signed by", signedName ?? "—"],
            ["Signed on", formatDate(signedAt)],
            ["Verified on", formatDate(verifiedAt)],
            ["Account", companyName],
          ]}
        />

        <div className="mt-5">
          <AgreementViewer
            partnerId={partnerId}
            companyName={companyName}
            signed
            label="Open your signed agreement (PDF)"
          />
        </div>
      </Panel>

      {/* ---- Asking for more ---- */}
      <Panel
        title="Add medications"
        description="Ask for preparations that are not on your price list. We price them, and the additions are added to your agreement by signed change order."
      >
        {openAmendment ? (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge kind="amendment" status={openAmendment.status} />
              <span className="text-[0.8125rem] font-semibold text-[color:var(--admin-ink)]">
                Change order {openAmendment.number}
              </span>
              <span className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">
                {openAmendment.itemCount}{" "}
                {openAmendment.itemCount === 1 ? "medication" : "medications"} · requested{" "}
                {formatDate(openAmendment.requestedAt)}
              </span>
            </div>

            <p className="mt-3 text-[0.875rem] text-[color:var(--admin-ink-70)]">
              {AMENDMENT_SAYS[openAmendment.status] ?? "This request is in progress."}
            </p>

            {/* Out for signature is the one state where the next move is not
                "go and look at it" — so the button goes straight to the page
                that signs it, the same way the pipeline's own dashboard
                points at the MSA rather than at the application. */}
            {openAmendment.status === "CHANGE_ORDER_SENT" ? (
              <Link
                href="/portal/agreement/change-order"
                className="admin-btn admin-btn-primary mt-4"
              >
                <FileText className="size-3.5" strokeWidth={2} aria-hidden />
                Review and sign it
              </Link>
            ) : (
              <Link href="/portal/products" className="admin-btn admin-btn-secondary mt-4">
                <FileText className="size-3.5" strokeWidth={2} aria-hidden />
                Open this change order
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* One open request at a time, so this is a button rather than a
                form the partner could submit twice. */}
            <p className="text-[0.875rem] text-[color:var(--admin-ink-70)]">
              Nothing is in progress. Adding a medication re-opens the agreement
              only for the new items — your existing prices are untouched.
            </p>
            <Link href="/portal/products" className="admin-btn admin-btn-primary mt-4">
              <PlusCircle className="size-3.5" strokeWidth={2} aria-hidden />
              Request additional medications
            </Link>
          </div>
        )}
      </Panel>

      <p className="pt-1 text-[0.8125rem] text-[color:var(--admin-ink-50)]">
        <Link href="/portal/application" className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--admin-accent)" }}>
          See your application and every step it went through
          <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden />
        </Link>
      </p>
    </div>
  );
}
