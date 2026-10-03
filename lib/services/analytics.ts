import "server-only";

import { db } from "@/lib/db";

/* ===========================================================================
   Analytics queries for the admin dashboard.

   Every figure here is computed in Postgres and returned as a small object.
   The temptation with a traffic table is to `findMany()` a date range and
   reduce it in JavaScript; at 3,000 rows that is invisible and at 3,000,000
   it is a dead page. Aggregation belongs in the database, so these are raw
   SQL where Prisma's groupBy cannot express the shape (date truncation,
   count-distinct, a lateral for the previous period).

   Everything is parameterised through Prisma's tagged template, which sends
   real bind parameters rather than interpolating — a `$queryRawUnsafe` with a
   date built from a query string is how an analytics page becomes an
   injection point.
   ========================================================================= */

export type Range = 7 | 30 | 90;

export type Totals = {
  views: number;
  uniques: number;
  avgDurationSeconds: number;
  /** Share of sessions that saw exactly one page, 0–1. */
  bounceRate: number;
};

export type TrendPoint = { date: string; views: number; uniques: number };
export type TopRow = { label: string; views: number; uniques: number };

function since(days: Range): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

/** The same window, immediately before — for the period-over-period delta. */
function previousWindow(days: Range): { from: Date; to: Date } {
  const to = since(days);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { from, to };
}

async function totalsBetween(from: Date, to?: Date): Promise<Totals> {
  const rows = await db.$queryRaw<
    { views: bigint; uniques: bigint; avg_duration: number | null; single_page_sessions: bigint; sessions: bigint }[]
  >`
    WITH scoped AS (
      SELECT * FROM "PageView"
      WHERE "createdAt" >= ${from}
        AND (${to}::timestamptz IS NULL OR "createdAt" < ${to}::timestamptz)
    ),
    per_session AS (
      SELECT "sessionId", COUNT(*) AS hits FROM scoped GROUP BY "sessionId"
    )
    SELECT
      (SELECT COUNT(*) FROM scoped)                                  AS views,
      (SELECT COUNT(DISTINCT "visitorHash") FROM scoped)             AS uniques,
      (SELECT AVG("durationMs") FROM scoped)                         AS avg_duration,
      (SELECT COUNT(*) FROM per_session WHERE hits = 1)              AS single_page_sessions,
      (SELECT COUNT(*) FROM per_session)                             AS sessions
  `;

  const r = rows[0];
  const sessions = Number(r?.sessions ?? 0);

  return {
    views: Number(r?.views ?? 0),
    uniques: Number(r?.uniques ?? 0),
    avgDurationSeconds: Math.round((r?.avg_duration ?? 0) / 1000),
    bounceRate: sessions === 0 ? 0 : Number(r?.single_page_sessions ?? 0) / sessions,
  };
}

/** Headline figures plus the change against the preceding equal window. */
export async function getOverview(days: Range) {
  const prev = previousWindow(days);
  const [current, previous] = await Promise.all([
    totalsBetween(since(days)),
    totalsBetween(prev.from, prev.to),
  ]);

  // Guard the zero case explicitly: "+100%" from a base of nothing is noise,
  // and Infinity renders as "∞%".
  const delta = (now: number, before: number) =>
    before === 0 ? null : Number((((now - before) / before) * 100).toFixed(1));

  return {
    current,
    previous,
    change: {
      views: delta(current.views, previous.views),
      uniques: delta(current.uniques, previous.uniques),
      avgDurationSeconds: delta(current.avgDurationSeconds, previous.avgDurationSeconds),
      bounceRate: delta(current.bounceRate, previous.bounceRate),
    },
  };
}

/**
 * Daily series, gap-filled.
 *
 * `generate_series` left-joined against the data is what stops a quiet
 * Saturday from collapsing the chart: without it a day with no traffic is a
 * missing row, and the line silently joins Friday to Sunday as though the gap
 * never happened.
 */
export async function getTrend(days: Range): Promise<TrendPoint[]> {
  const rows = await db.$queryRaw<{ day: Date; views: bigint; uniques: bigint }[]>`
    SELECT
      d.day::date                                  AS day,
      COUNT(pv.id)                                 AS views,
      COUNT(DISTINCT pv."visitorHash")             AS uniques
    FROM generate_series(${since(days)}::date, CURRENT_DATE, '1 day') AS d(day)
    LEFT JOIN "PageView" pv
      ON pv."createdAt" >= d.day
     AND pv."createdAt" <  d.day + INTERVAL '1 day'
    GROUP BY d.day
    ORDER BY d.day
  `;

  return rows.map((r) => ({
    date: r.day.toISOString().slice(0, 10),
    views: Number(r.views),
    uniques: Number(r.uniques),
  }));
}

export async function getTopPages(days: Range, limit = 8): Promise<TopRow[]> {
  const rows = await db.$queryRaw<{ path: string; views: bigint; uniques: bigint }[]>`
    SELECT "path", COUNT(*) AS views, COUNT(DISTINCT "visitorHash") AS uniques
    FROM "PageView"
    WHERE "createdAt" >= ${since(days)}
    GROUP BY "path"
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ label: r.path, views: Number(r.views), uniques: Number(r.uniques) }));
}

export async function getTopReferrers(days: Range, limit = 6): Promise<TopRow[]> {
  const rows = await db.$queryRaw<{ host: string; views: bigint; uniques: bigint }[]>`
    SELECT COALESCE("referrerHost", 'Direct') AS host,
           COUNT(*) AS views,
           COUNT(DISTINCT "visitorHash") AS uniques
    FROM "PageView"
    WHERE "createdAt" >= ${since(days)}
    GROUP BY 1
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ label: r.host, views: Number(r.views), uniques: Number(r.uniques) }));
}

export async function getDeviceSplit(days: Range): Promise<TopRow[]> {
  const rows = await db.$queryRaw<{ device: string; views: bigint }[]>`
    SELECT COALESCE("device", 'unknown') AS device, COUNT(*) AS views
    FROM "PageView"
    WHERE "createdAt" >= ${since(days)}
    GROUP BY 1
    ORDER BY views DESC
  `;
  return rows.map((r) => ({ label: r.device, views: Number(r.views), uniques: 0 }));
}

/** Counters for the dashboard's content tiles. */
export async function getContentCounts() {
  const [products, activeProducts, posts, published, drafts] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { isActive: true } }),
    db.post.count(),
    db.post.count({ where: { status: "PUBLISHED" } }),
    db.post.count({ where: { status: "DRAFT" } }),
  ]);
  return { products, activeProducts, posts, published, drafts };
}

/**
 * Record a page view.
 *
 * Bots are dropped rather than counted: a dashboard that includes crawler
 * traffic tells you about crawlers. The check is a coarse UA match, which is
 * the honest limit of a first-party tracker with no device fingerprinting.
 */
export async function recordPageView(input: {
  path: string;
  visitorHash: string;
  sessionId: string;
  referrerHost?: string | null;
  device?: string | null;
  browser?: string | null;
  country?: string | null;
  durationMs?: number | null;
}): Promise<void> {
  await db.pageView.create({ data: input });
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|monitor|curl|wget/i;

export function isBot(userAgent: string): boolean {
  return BOT_PATTERN.test(userAgent);
}

export function deviceFromUserAgent(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function browserFromUserAgent(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}
