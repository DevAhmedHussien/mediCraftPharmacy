import Link from "next/link";

import { BreakdownList } from "@/components/admin/BreakdownList";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { TrafficChart } from "@/components/admin/TrafficChart";
import { Cell, DataTable, PageHeader, Panel, Pill, Row } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/guard";
import {
  getContentCounts,
  getDeviceSplit,
  getOverview,
  getTopPages,
  getTopReferrers,
  getTrend,
  type Range,
} from "@/lib/services/analytics";

export const metadata = { title: "Traffic" };
export const dynamic = "force-dynamic";

/* ===========================================================================
   The website's own screen.

   WHY IT LEFT THE OVERVIEW
   ------------------------
   Traffic took up two thirds of the admin's front page — a full-width chart,
   four breakdown tables and a date-range control — and nobody is waiting on
   any of it. An operator opening /admin is asking whether a partner needs a
   reply, and they were scrolling past a month of page views to find out.

   It is also a different job on a different clock: the queue is read several
   times a day, this is read once a week by whoever is looking after the site.
   Two jobs, two screens.

   The pipeline numbers stay on the overview. This page is only the parts that
   are about visitors.
   ========================================================================= */

function parseRange(value: string | undefined): Range {
  const n = Number(value);
  return n === 7 || n === 90 ? n : 30;
}

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export default async function AdminTrafficPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  await requireAdminPage("/admin/traffic");

  const range = parseRange(searchParams.range);

  // Independent aggregates. Sequential awaits would make the page as slow as
  // their sum; they share one pool and Postgres runs them concurrently.
  const [overview, trend, pages, referrers, devices, content] = await Promise.all([
    getOverview(range),
    getTrend(range),
    getTopPages(range),
    getTopReferrers(range),
    getDeviceSplit(range),
    getContentCounts(),
  ]);

  const delta = (value: number | null) =>
    value === null ? "No prior period" : `${value > 0 ? "+" : ""}${value}% vs previous`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Traffic"
        description={`${overview.current.views.toLocaleString()} page views from ${overview.current.uniques.toLocaleString()} visitors in the last ${range} days. First-party and cookieless — no third-party analytics runs on this site.`}
        actions={<RangeTabs current={range} />}
      />

      <Panel title="Page views and unique visitors" description="Per day.">
        <TrafficChart points={trend} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel title="Audience" className="lg:col-span-1">
          <DataTable head={["Metric", "Value"]} caption={`Audience metrics for the last ${range} days, each against the previous period.`}>
            {[
              ["Page views", overview.current.views.toLocaleString(), overview.change.views],
              [
                "Unique visitors",
                overview.current.uniques.toLocaleString(),
                overview.change.uniques,
              ],
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

      {/* What there is to be found, which is the other half of a traffic
          question: a page nobody visits and a page that does not exist look
          the same in the chart above. */}
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
