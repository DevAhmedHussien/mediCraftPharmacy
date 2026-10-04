import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, FileText, Package, Phone } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { site, hasRealPhone } from "@/lib/site";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PortalWelcomePage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      companyName: true,
      status: true,
      verifiedAt: true,
      application: { select: { practiceName: true } },
      msaEnvelopes: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { signedName: true, completedAt: true },
      },
      pricing: { where: { isActive: true }, select: { id: true }, take: 1 },
    },
  });
  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;

  /* This page is the reward for finishing, so it is only reachable by someone
     who has. Anyone earlier goes back to their status page rather than seeing
     a congratulations screen for something they have not done. */
  if (status !== PARTNER_STATUS.VERIFIED) redirect("/portal");

  const signature = partner.msaEnvelopes[0];
  const name = partner.application?.practiceName ?? partner.companyName;

  return (
    <PortalShell accountName={name} title={`Welcome, ${name}`} eyebrow="Verified partner" status={status}>
      <div className="flex items-start gap-3 rounded-tile border border-emerald-200 bg-emerald-50 px-5 py-4">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" strokeWidth={2.2} aria-hidden />
        <div>
          <p className="text-meta font-bold text-emerald-900">
            Your account is verified and open.
          </p>
          <p className="mt-1 text-caption text-emerald-800">
            {partner.verifiedAt && (
              <>
                Activated{" "}
                {partner.verifiedAt.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                .{" "}
              </>
            )}
            {signature?.signedName && (
              <>Agreement signed by {signature.signedName}.</>
            )}
          </p>
        </div>
      </div>

      <p className="mt-8 text-intro text-ink-soft text-pretty">
        Everything is in place — your pricing is live, your prescribers are on file and your
        agreement is executed. Here is what happens next.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Next
          icon={<Package className="size-4" strokeWidth={2.2} aria-hidden />}
          title="Your first order"
          body="Send prescriptions the way you normally would. Your account representative will confirm the first one by phone so nothing is held up by a formatting question."
        />
        <Next
          icon={<FileText className="size-4" strokeWidth={2.2} aria-hidden />}
          title="Your agreed pricing"
          body={
            partner.pricing.length > 0
              ? "The rates you negotiated are attached to your account and applied automatically. You can see them any time."
              : "Your rates are attached to your account and applied automatically."
          }
          href="/portal/pricing"
          hrefLabel="View your price list"
        />
        <Next
          icon={<Phone className="size-4" strokeWidth={2.2} aria-hidden />}
          title="Who to call"
          body={`Prescription questions, shipping, invoices — one line, and it reaches a pharmacist, not a queue.${hasRealPhone ? ` ${site.phone}.` : ""}`}
          href="/support"
          hrefLabel="Support"
        />
        <Next
          icon={<BadgeCheck className="size-4" strokeWidth={2.2} aria-hidden />}
          title="Keeping licences current"
          body="We will email you sixty days before any DEA registration or state licence on your account expires. Nothing lapses quietly."
        />
      </div>

      <p className="mt-10 border-t border-line pt-6 text-meta text-ink-soft">
        <Link href="/portal" className="link-arrow">
          Back to your account
        </Link>
      </p>
    </PortalShell>
  );
}

function Next({
  icon,
  title,
  body,
  href,
  hrefLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="rounded-tile border border-line bg-white p-5">
      <p className="flex items-center gap-2 text-meta font-bold text-ink">
        <span className="text-brand-600">{icon}</span>
        {title}
      </p>
      <p className="mt-2 text-caption leading-relaxed text-ink-soft">{body}</p>
      {href && hrefLabel && (
        <Link href={href} className="link-arrow mt-3 inline-block text-caption">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}
