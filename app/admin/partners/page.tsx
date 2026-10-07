import Link from "next/link";

import { PartnersTable } from "@/components/admin/PartnersTable";
import { statusEntry } from "@/components/admin/StatusBadge";
import { EmptyState, PageHeader, Panel, StatStrip } from "@/components/admin/ui";
import { requirePermissionPage } from "@/lib/guard";
import { ADMIN_ACTIONABLE_STATUSES, PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { countByStatus, listPartners } from "@/lib/services/partners";

export const metadata = { title: "Partners" };

const STATUSES = Object.values(PARTNER_STATUS);

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requirePermissionPage("partners.view");

  const status = (STATUSES.find((s) => s === searchParams.status) ?? "all") as
    | PartnerStatus
    | "all";

  const [partners, counts] = await Promise.all([listPartners({ status }), countByStatus()]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const waiting = ADMIN_ACTIONABLE_STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  const verified = counts[PARTNER_STATUS.VERIFIED] ?? 0;
  const rejected =
    (counts[PARTNER_STATUS.REJECTED] ?? 0) + (counts[PARTNER_STATUS.MSA_DECLINED] ?? 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Partners"
        description="The onboarding pipeline. Sorted oldest-waiting first, so nothing sits."
      />

      <StatStrip
        stats={[
          { label: "Waiting on us", value: waiting, detail: "Needs an admin action", urgent: true },
          { label: "In progress", value: total - waiting - verified - rejected },
          { label: "Verified", value: verified },
          { label: "Rejected or declined", value: rejected },
        ]}
      />

      {/* Chips rather than a select: the counts are the useful part, and an
          operator needs to see where the queue is without opening a menu. */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/admin/partners"
          aria-current={status === "all" ? "page" : undefined}
          className="admin-chip"
        >
          All · {total}
        </Link>

        {STATUSES.filter((s) => counts[s]).map((s) => (
          <Link
            key={s}
            href={`/admin/partners?status=${s}`}
            aria-current={status === s ? "page" : undefined}
            className="admin-chip"
          >
            {/* The same label the badge in the table uses. A filter chip
                reading "onboarding submitted" above a row badged "Details to
                review" is two names for one thing. */}
            {statusEntry("partner", s).label} · {counts[s]}
          </Link>
        ))}
      </div>

      <Panel bodyClassName="p-3">
        {partners.length === 0 ? (
          <EmptyState
            title="No partners in this status"
            description="Applications arrive through the Work With Us form on the public site."
            action={{ label: "View the form", href: "/work-with-us" }}
          />
        ) : (
          <PartnersTable
            rows={partners.map((p) => ({
              id: p.id,
              companyName: p.application?.practiceName ?? p.companyName,
              contactName: p.contactName,
              email: p.user.email,
              state: p.application?.practiceState ?? null,
              status: p.status,
              statusChangedAt: p.statusChangedAt.toISOString(),
            }))}
          />
        )}
      </Panel>
    </div>
  );
}
