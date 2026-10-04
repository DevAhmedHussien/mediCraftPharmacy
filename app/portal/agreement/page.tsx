import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AgreementSigner } from "@/components/portal/AgreementSigner";
import { AgreementViewer } from "@/components/portal/AgreementViewer";
import { PortalShell } from "@/components/portal/PortalShell";
import { WaitingNotice } from "@/components/portal/WaitingNotice";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { canAccess, currentStepHref } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { getSignableChangeOrder } from "@/lib/services/amendments";
import { agreementText, INTERNAL_DISCLOSURE, signature } from "@/lib/services/signature";

export const metadata: Metadata = { title: "Agreement", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PortalAgreementPage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      companyName: true,
      status: true,
      msaEnvelopes: {
        /* The MSA, never a change order. Change orders are envelopes on the
           same partner and are always newer, so `take: 1` was eventually
           going to hand this page Exhibit B and let it report the MSA as
           "signed by" whoever signed the latest change order. */
        where: { amendments: { none: {} } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, completedAt: true, signedName: true, driver: true },
      },
    },
  });
  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;
  if (!canAccess(status, "agreement")) redirect(currentStepHref(status));

  const envelope = partner.msaEnvelopes[0];
  const text = agreementText(partner.companyName);
  const signed = envelope?.status === "COMPLETED";

  /* A change order waiting on them. It is signed on its own page — this one
     is the MSA — but this is where a partner following the "sign your
     agreement" habit, or the link in the change-order email, will land. */
  const changeOrder = await getSignableChangeOrder(partner.id);

  return (
    <PortalShell
      accountName={partner.companyName}
      title="Master Service Agreement"
      eyebrow="Agreement"
      status={status}
      back={{ href: "/portal", label: "Your application" }}
    >
      {changeOrder && (
        <div className="mb-6 rounded-tile border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="font-bold text-ink">
            Change order {changeOrder.number} is waiting for your signature
          </p>
          <p className="mt-1 text-meta text-ink-soft">
            It adds {changeOrder.lines.length}{" "}
            {changeOrder.lines.length === 1 ? "preparation" : "preparations"} to your schedule
            at the prices you accepted. Your Master Service Agreement below is unaffected.
          </p>
          <Link
            href="/portal/agreement/change-order"
            className="link-arrow mt-2 inline-block font-semibold"
          >
            Review and sign it
          </Link>
        </div>
      )}

      {signed ? (
        <div className="rounded-tile border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-meta text-emerald-900">
            Signed by {envelope.signedName} on{" "}
            {envelope.completedAt?.toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            })}
            .
          </p>
          <AgreementViewer
            partnerId={partner.id}
            companyName={partner.companyName}
            signed
            label="View your signed agreement (PDF)"
            className="mt-2"
          />
        </div>
      ) : (
        <>
          <p className="text-intro text-ink-soft text-pretty">
            This is the last step. Read the agreement, then sign it below.
          </p>
          <p className="mt-3">
            <AgreementViewer
              partnerId={partner.id}
              companyName={partner.companyName}
              signed={false}
              label="Open the full agreement as a PDF — your agreed prices are Exhibit A-1"
            />
          </p>
          <p className="mt-4 rounded-tile border border-line bg-sand px-4 py-3 text-caption text-ink-soft">
            Section 4.1 refers to <strong className="font-semibold">Exhibit A</strong> and the
            Partner Formulary. Exhibit A is the price list you accepted earlier — you can{" "}
            <Link href="/portal/pricing" className="link-arrow">
              open it in a new tab
            </Link>{" "}
            while you read. Under Section 16.9 it controls over the body of the agreement.
          </p>
        </>
      )}

      {/* The agreement itself. `whitespace-pre-wrap` because the text is
          authored as plain prose with meaningful line breaks — running it
          through a Markdown renderer would reflow clauses. */}
      <article
        className="mt-8 max-h-[28rem] overflow-y-auto rounded-tile border border-line bg-sand p-6 text-meta leading-relaxed text-ink-soft"
        tabIndex={0}
        aria-label="Agreement text"
      >
        <pre className="whitespace-pre-wrap font-sans">{text}</pre>
      </article>

      <div className="mt-8">
        {signed ? (
          <WaitingNotice>
            We are activating your account. You will have full access within a few minutes.
          </WaitingNotice>
        ) : status === PARTNER_STATUS.MSA_SENT ? (
          <AgreementSigner disclosure={INTERNAL_DISCLOSURE} driver={signature.name} />
        ) : (
          <WaitingNotice>
            Your agreement has not been issued yet. We will email you the moment it is ready.
          </WaitingNotice>
        )}
      </div>
    </PortalShell>
  );
}
