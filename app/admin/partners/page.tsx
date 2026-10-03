import Link from "next/link";

import { PartnersTable } from "@/components/admin/PartnersTable";
import { EmptyState, PageHeader, Panel, StatStrip } from "@/components/admin/ui";
import { requirePermissionPage } from "@/lib/guard";
import { ADMIN_ACTIONABLE_STATUSES, PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { countByStatus, listPartners } from "@/lib/services/partners";
import { cn } from "@/lib/utils";

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
          className={cn(
            "rounded-[5px] border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors",
            status === "all"
              ? "border-[color:var(--admin-accent)] bg-[#e7edff] text-[color:var(--admin-accent)]"
              : "border-[color:var(--admin-border-strong)] bg-[color:var(--admin-surface)] text-[color:var(--admin-ink-70)] hover:text-[color:var(--admin-ink)]"
          )}
        >
          All · {total}
        </Link>

        {STATUSES.filter((s) => counts[s]).map((s) => (
          <Link
            key={s}
            href={`/admin/partners?status=${s}`}
            className={cn(
              "rounded-[5px] border px-2.5 py-1 text-[0.8125rem] transition-colors",
              status === s
                ? "border-[color:var(--admin-accent)] bg-[#e7edff] font-medium text-[color:var(--admin-accent)]"
                : "border-[color:var(--admin-border-strong)] bg-[color:var(--admin-surface)] text-[color:var(--admin-ink-70)] hover:text-[color:var(--admin-ink)]"
            )}
          >
            {s.replace(/_/g, " ").toLowerCase()} · {counts[s]}
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
