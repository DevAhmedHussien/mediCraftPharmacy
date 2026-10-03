import Link from "next/link";

import { BreakdownList } from "@/components/admin/BreakdownList";
import { PipelineFunnel } from "@/components/admin/PipelineFunnel";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { TrafficChart } from "@/components/admin/TrafficChart";
import { Cell, DataTable, PageHeader, Panel, Pill, Row, StatStrip, relativeDays } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { ADMIN_ACTIONABLE_STATUSES } from "@/lib/partner/status";
import { countByStatus } from "@/lib/services/partners";
import {
  getContentCounts,
  getDeviceSplit,
  getOverview,
  getTopPages,
  getTopReferrers,
  getTrend,
  type Range,
} from "@/lib/services/analytics";

export const metadata = { title: "Overview" };

function parseRange(value: string | undefined): Range {
  const n = Number(value);
  return n === 7 || n === 90 ? n : 30;
}

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = parseRange(searchParams.range);

  // Independent aggregates. Sequential awaits would make the page as slow as
  // their sum; they share one pool and Postgres runs them concurrently.
  const [
    overview,
    trend,
    pages,
    referrers,
    devices,
    content,
    changeOrders,
    queue,
    verifiedThisWeek,
    statusCounts,
    documentsWaiting,
  ] = await Promise.all([
      getOverview(range),
      getTrend(range),
      getTopPages(range),
      getTopReferrers(range),
      getDeviceSplit(range),
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
        take: 8,
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
        take: 8,
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

  const delta = (value: number | null) =>
    value === null ? "No prior period" : `${value > 0 ? "+" : ""}${value}% vs previous`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        description={`Last ${range} days. Traffic is first-party and cookieless.`}
        actions={<RangeTabs current={range} />}
      />

      {/* Queues first — these are the numbers with a person waiting at the
          other end. Volume is below, where it belongs. */}
      <StatStrip
        stats={[
          {
            label: "Partners waiting on us",
            value: queue.length,
            detail: "Oldest first",
            href: "/admin/partners",
            urgent: true,
          },
          {
            label: "Verified this week",
            value: verifiedThisWeek,
            href: "/admin/partners?status=VERIFIED",
          },
          {
            label: "Documents to review",
            value: documentsWaiting,
            detail: documentsWaiting === 0 ? "All clear" : "Licences and photo ID",
            href: "/admin/partners?status=ONBOARDING_SUBMITTED",
            urgent: documentsWaiting > 0,
          },
          {
            label: "Active products",
            value: content.activeProducts,
            detail: `${content.products - content.activeProducts} hidden`,
            href: "/admin/products",
          },
        ]}
      />

      {/* The pipeline reads first: this is a partner operations screen that
          also happens to carry traffic, not an analytics screen with partners
          bolted on. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <PipelineFunnel counts={statusCounts} />

        <Panel title="Waiting on us" description="Longest first.">
          {queue.length === 0 ? (
            <p className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">
              Nothing in the queue.
            </p>
          ) : (
            <ul className="-my-1 divide-y" style={{ borderColor: "var(--admin-border)" }}>
              {queue.map((partner) => (
                <li key={partner.id} className="py-2">
                  <Link href={`/admin/partners/${partner.id}`} className="group block">
                    <p className="truncate text-[0.8125rem] font-medium transition-colors group-hover:text-[color:var(--admin-accent)]">
                      {partner.application?.practiceName ?? partner.companyName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[0.75rem] text-[color:var(--admin-ink-50)]">
                      <span className="truncate">
                        {partner.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="shrink-0 tabular-nums">
                        {relativeDays(partner.statusChangedAt)}
                      </span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Only when there is something to act on — an empty panel on every
          dashboard teaches people to stop reading that corner of the page. */}
      {changeOrders.length > 0 && (
        <Panel
          title="Formulary change orders"
          description="Verified partners asking to add medications. They keep ordering meanwhile."
        >
          <DataTable head={["Partner", "Change order", "Items", "Status", "Waiting"]}>
            {changeOrders.map((order) => (
              <Row key={order.id}>
                <Cell>
                  <Link
                    href={`/admin/partners/${order.partnerId}`}
                    className="font-medium transition-colors hover:text-[color:var(--admin-accent)]"
                  >
                    {order.partner.companyName}
                  </Link>
                </Cell>
                <Cell className="tabular-nums">#{order.number}</Cell>
                <Cell numeric>{order._count.items}</Cell>
                <Cell>
                  <Pill tone={order.status === "REQUESTED" ? "warn" : "neutral"}>
                    {order.status.replace(/_/g, " ").toLowerCase()}
                  </Pill>
                </Cell>
                <Cell className="tabular-nums">{relativeDays(order.requestedAt)}</Cell>
              </Row>
            ))}
          </DataTable>
        </Panel>
      )}

      <Panel title="Traffic" description="Page views and unique visitors per day.">
        <TrafficChart points={trend} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel title="Audience" className="lg:col-span-1">
          <DataTable head={["Metric", "Value"]}>
            {[
              ["Page views", overview.current.views.toLocaleString(), overview.change.views],
              ["Unique visitors", overview.current.uniques.toLocaleString(), overview.change.uniques],
              [
                "Avg. time on page",
                duration(overview.current.avgDurationSeconds),
                overview.change.avgDurationSeconds,
              ],
              [
                "Bounce rate",
                `${Math.round(overview.current.bounceRate * 100)}%`,
                overview.change.bounceRate,
              ],
            ].map(([label, value, change]) => (
              <Row key={String(label)}>
                <Cell>
                  <span className="block">{label as string}</span>
                  <span className="mt-0.5 block text-[0.75rem] text-[color:var(--admin-ink-50)]">
                    {delta(change as number | null)}
                  </span>
                </Cell>
                <Cell numeric className="font-semibold">
                  {value as string}
                </Cell>
              </Row>
            ))}
          </DataTable>
        </Panel>

        <BreakdownList title="Top pages" rows={pages} metric="views" />
        <BreakdownList title="Referrers" rows={referrers} metric="views" />
        <BreakdownList title="Devices" rows={devices} metric="views" />
      </div>

      <Panel
        title="Content"
        actions={
          <>
            <Link href="/admin/products" className="admin-btn admin-btn-secondary">
              Products
            </Link>
            <Link href="/admin/blog" className="admin-btn admin-btn-secondary">
              Articles
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[0.8125rem]">
          <span className="flex items-center gap-2">
            <Pill tone="good">{content.activeProducts}</Pill> products live
          </span>
          <span className="flex items-center gap-2">
            <Pill>{content.products - content.activeProducts}</Pill> hidden
          </span>
          <span className="flex items-center gap-2">
            <Pill tone="good">{content.published}</Pill> articles published
          </span>
          <span className="flex items-center gap-2">
            <Pill tone="warn">{content.drafts}</Pill> in draft
          </span>
        </div>
      </Panel>
    </div>
  );
}
