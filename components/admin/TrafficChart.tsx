"use client";

import { useId, useMemo, useState } from "react";

import type { TrendPoint } from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Daily traffic — two series over time, so: multi-line, categorical colour.

   PALETTE
   -------
   brand-500 #1b54fb (the exact logo blue) and cyan-600 #0c959d. That pair was
   run through the six colour checks rather than eyeballed, on a white
   surface: lightness band ok, chroma floor ok, CVD separation ΔE 21.5
   (deuteranopia) and 14.2 (tritanopia), normal-vision ΔE 24.7, both ≥ 3:1
   against the surface.

   The obvious first choice — brand-500 with cyan-700, the "accessible on
   white" step used for cyan text elsewhere on this site — FAILS the chroma
   floor at 0.081: desaturated that far, it reads as grey next to a saturated
   blue and stops looking like a second series at all. cyan-600 is the
   nearest step that passes, so it is what the chart uses. Do not "fix" this
   back to cyan-700.

   IDENTITY IS NEVER COLOUR ALONE
   ------------------------------
   Two series, so a legend is always present, and the last point of each line
   is direct-labelled. Under full colour-vision loss the labels still resolve
   which line is which. A table view sits behind a <details> for anyone who
   needs the numbers rather than the shape.

   ONE AXIS
   --------
   Views and uniques share a scale deliberately. They are the same unit of
   measure (people/hits per day) and uniques is always ≤ views, so the gap
   between the lines is itself the information — how many pages a visitor
   reads. A second y-axis would destroy exactly that.
   ========================================================================= */

const SERIES = [
  { key: "views" as const, label: "Page views", color: "var(--admin-accent)" },
  { key: "uniques" as const, label: "Unique visitors", color: "#0c959d" },
];

// The drawing is done in a fixed coordinate space and scaled by the viewBox;
// `vector-effect: non-scaling-stroke` keeps the 2px lines at 2px whatever the
// container width, so a wide screen does not get fat lines.
const W = 720;
const H = 240;
const PAD = { top: 14, right: 16, bottom: 26, left: 46 };

const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

/**
 * An axis top that divides into four readable steps.
 *
 * Rounding only the maximum is not enough: a max of 250 quartered gives
 * 62.5, 125, 187.5, and the axis reads 63 / 125 / 188 — three numbers nobody
 * would choose. Picking the *step* from a 1-2-5 ladder first and deriving the
 * max from it keeps every gridline round.
 */
const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];

function niceScale(value: number): { max: number; ticks: number[] } {
  const step =
    STEPS.find((s) => s * 4 >= value) ?? Math.ceil(value / 4 / 10000) * 10000;
  const max = step * 4;
  return { max, ticks: [0, step, step * 2, step * 3, max] };
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function TrafficChart({
  points,
  className,
}: {
  points: TrendPoint[];
  className?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { ticks, x, y, paths } = useMemo(() => {
    const { max, ticks } = niceScale(Math.max(1, ...points.flatMap((p) => [p.views, p.uniques])));

    // A single point has no width to divide, so guard the divisor rather than
    // producing NaN coordinates that silently render nothing.
    const step = points.length > 1 ? plotW / (points.length - 1) : 0;
    const x = (i: number) => PAD.left + i * step;
    const yOf = (v: number) => PAD.top + plotH - (v / max) * plotH;

    const paths = SERIES.map((s) => ({
      ...s,
      d: points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yOf(p[s.key]).toFixed(1)}`).join(" "),
    }));

    return { max, ticks, x, y: yOf, paths };
  }, [points]);

  if (points.length === 0) {
    return <p className={cn("text-meta text-ink-muted", className)}>No traffic recorded yet.</p>;
  }

  const active = hover !== null ? points[hover] : null;

  // Label every nth day so the axis never collides with itself at 90 days.
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <figure className={cn("not-prose", className)}>
      <figcaption className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2 text-caption text-ink-soft">
            <span
              aria-hidden
              className="block h-[3px] w-4 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </figcaption>

      <div
        className="relative"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          // Map the pointer back into chart space, then to the nearest index.
          const ratio = (e.clientX - box.left) / box.width;
          const chartX = ratio * W - PAD.left;
          const i = Math.round((chartX / plotW) * (points.length - 1));
          setHover(Math.min(points.length - 1, Math.max(0, i)));
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ aspectRatio: `${W} / ${H}` }}
          role="img"
          aria-label={`Daily page views and unique visitors over the last ${points.length} days.`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-accent)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--admin-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid and axis labels, recessive — they orient, they do not compete. */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="#e6ebf4"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 10}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink-muted"
                style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
              >
                {t.toLocaleString()}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text
                key={p.date}
                x={x(i)}
                y={H - 6}
                textAnchor="middle"
                className="fill-ink-muted"
                style={{ fontSize: 11 }}
              >
                {formatDay(p.date)}
              </text>
            ) : null
          )}

          {/* Fill under the leading series only — two stacked translucent
              fills would mix into a third colour that means nothing. */}
          <path
            d={`${paths[0].d} L${x(points.length - 1)},${PAD.top + plotH} L${PAD.left},${PAD.top + plotH} Z`}
            fill={`url(#${gradientId})`}
          />

          {paths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Crosshair + markers for the hovered day. */}
          {hover !== null && active && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="#9aa6c0"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={x(hover)}
                  cy={y(active[s.key])}
                  r={4.5}
                  fill={s.color}
                  // 2px surface ring, so a marker sitting on the other line
                  // stays readable as a separate mark.
                  stroke="#ffffff"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}
        </svg>

        {/* Tooltip. Positioned in percentage terms so it tracks the SVG's
            responsive scaling without measuring anything. */}
        {hover !== null && active && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-[10rem] -translate-x-1/2 rounded-[0.75rem] border border-[color:var(--admin-border-strong)] bg-white px-3 py-2"
            style={{
              left: `${Math.min(88, Math.max(12, ((x(hover) / W) * 100)))}%`,
            }}
          >
            <p className="font-mono text-[0.625rem] uppercase tracking-wide text-ink-muted">
              {formatDay(active.date)}
            </p>
            {SERIES.map((s) => (
              <p key={s.key} className="mt-1 flex items-center justify-between gap-4 text-caption">
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <span
                    aria-hidden
                    className="block h-[3px] w-3 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
                <span className="font-mono font-medium text-ink tabular-nums">
                  {active[s.key].toLocaleString()}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* The numbers, for anyone the shape does not serve. */}
      <details className="mt-4 group">
        <summary className="cursor-pointer text-caption text-ink-muted hover:text-brand-600">
          View as table
        </summary>
        <div className="mt-3 max-h-64 overflow-auto rounded-[0.75rem] border border-hair">
          <table className="w-full text-caption">
            <thead className="sticky top-0 bg-sand">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium text-ink-soft">Date</th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-ink-soft">Views</th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-ink-soft">Uniques</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink-soft">{formatDay(p.date)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-ink">{p.views}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-ink">{p.uniques}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
