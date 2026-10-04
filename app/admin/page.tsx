import Link from "next/link";

import { BarChart3 } from "lucide-react";

import { PipelineFunnel } from "@/components/admin/PipelineFunnel";
import { PageHeader, StatStrip, Zone } from "@/components/admin/ui";
import {
  Worklist,
  amendmentWorkItem,
  partnerWorkItem,
} from "@/components/admin/Worklist";
import { db } from "@/lib/db";
import { ADMIN_ACTIONABLE_STATUSES } from "@/lib/partner/status";
import { countByStatus } from "@/lib/services/partners";
import { getContentCounts } from "@/lib/services/analytics";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  // Independent aggregates. Sequential awaits would make the page as slow as
  // their sum; they share one pool and Postgres runs them concurrently.
  const [content, changeOrders, queue, verifiedThisWeek, statusCounts, documentsWaiting] =
    await Promise.all([
      getContentCounts(),
      /* Open change orders.
       *
       * A verified partner asking for more medications never moves on the
       * pipeline — that is the point of the amendment lifecycle — so they do
       * not appear in "Waiting on us", which reads partner.status. Without
       * this panel the only trace on the dashboard is a bell notification
       * that scrolls away, and a request can sit unanswered for a week. */
      db.formularyAmendment.findMany({
        where: { status: { in: ["REQUESTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "ACCEPTED"] } },
        orderBy: { requestedAt: "asc" },
        take: 25,
        select: {
          id: true,
          number: true,
          status: true,
          requestedAt: true,
          partnerId: true,
          partner: { select: { companyName: true } },
          _count: { select: { items: true } },
        },
      }),
      db.partner.findMany({
        where: { status: { in: ADMIN_ACTIONABLE_STATUSES as never } },
        orderBy: { statusChangedAt: "asc" },
        take: 25,
        select: {
          id: true,
          companyName: true,
          status: true,
          statusChangedAt: true,
          application: { select: { practiceName: true } },
        },
      }),
      db.partner.count({
        where: { verifiedAt: { gte: new Date(Date.now() - 7 * 864e5) } },
      }),
      countByStatus(),
      db.partnerDocument.count({ where: { status: "PENDING_REVIEW" } }),
    ]);

  /* One queue out of two sources — see components/admin/Worklist.tsx. */
  const work = [...queue.map(partnerWorkItem), ...changeOrders.map(amendmentWorkItem)];

  /* The page's answer to its own question, in a sentence, above every number.
     An operator opening this screen is asking "is anything waiting on me",
     and a row of figures makes them do the arithmetic to find out. */
  const lede =
    work.length === 0
      ? "Nothing is waiting on a reply."
      : `${work.length} ${work.length === 1 ? "thing needs" : "things need"} an answer` +
        (documentsWaiting > 0
          ? `, and ${documentsWaiting} ${documentsWaiting === 1 ? "document is" : "documents are"} up for review.`
          : ".");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description={lede}
        actions={
          <Link href="/admin/traffic" className="admin-btn admin-btn-secondary">
            <BarChart3 className="size-3.5" strokeWidth={2} aria-hidden />
            Website traffic
          </Link>
        }
      />

      {/* ---------------------------------------------------------------
          ZONE 1 — the work. Everything with a person waiting at the other
          end, in one list, oldest first. It is first on the page and it is
          the only zone that is ever about today.
          --------------------------------------------------------------- */}
      <Zone
        title="Needs you"
        description={work.length === 0 ? "The queue is clear." : "Oldest first."}
      >
        <Worklist items={work} />
      </Zone>

      {/* ---------------------------------------------------------------
          ZONE 2 — the shape of the book. Not urgent, but the thing a manager
          opens this page for once a week.
          --------------------------------------------------------------- */}
      <Zone title="Pipeline" description={`${verifiedThisWeek} verified in the last 7 days`}>
        <StatStrip
          stats={[
            {
              label: "Waiting on us",
              value: work.length,
              detail: work.length === 0 ? "All answered" : "Applications and change orders",
              href: "/admin/partners",
              urgent: true,
            },
            {
              label: "Documents to review",
              value: documentsWaiting,
              detail: documentsWaiting === 0 ? "All clear" : "Licences and photo ID",
              href: "/admin/partners?status=ONBOARDING_SUBMITTED",
              urgent: documentsWaiting > 0,
            },
            {
              label: "Verified this week",
              value: verifiedThisWeek,
              detail: "Live accounts",
              href: "/admin/partners?status=VERIFIED",
            },
            {
              label: "Active products",
              value: content.activeProducts,
              detail: `${content.products - content.activeProducts} hidden`,
              href: "/admin/products",
            },
          ]}
        />

        <PipelineFunnel counts={statusCounts} />
      </Zone>
    </div>
  );
}
