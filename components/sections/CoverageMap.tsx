import { coverageCounts, stateGrid, type LicenceStatus } from "@/lib/coverage";
import { US_MAP_VIEWBOX, US_STATE_SHAPES } from "@/lib/us-map-shapes";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Licensure map.

   Brief §4.14: no stock US map, and this must be "a data-driven SVG the team
   can update without a designer" delivered "as a component, not a flat image".
   It renders from lib/coverage.ts — flip a status there and the map, the
   legend and the counts all follow.

   WHY REAL GEOGRAPHY AND NOT A GRID OF SQUARES
   --------------------------------------------
   This was a tile cartogram: every state an equal rounded square laid out on a
   12x8 grid. That form is honest about area (it refuses to let Montana shout
   over New Jersey) but it asks the reader to learn a diagram before they can
   answer the only question they came with — "can you ship to me?" A prescriber
   in Ohio finds Ohio on a map of the United States instantly and finds it on a
   grid of squares only by reading labels one at a time.

   So the geometry is now the real thing: US Census state outlines, projected
   with d3-geo's Albers USA (which insets Alaska and Hawaii), simplified and
   baked into lib/us-map-shapes.ts at build time. The browser ships no
   projection code, no TopoJSON and no map library — just path data, about 24KB
   of it. Regenerate with `node scripts/generate-us-map.mjs`.

   It is still a component driven by data, not the flat image the brief
   forbids: nothing here is an exported picture, and no status is hardcoded.

   STATUS IS NEVER CARRIED BY COLOUR ALONE
   ---------------------------------------
   A solid fill also gets a solid border; a pending state gets a dashed one;
   and the summary under the map states the position in words. Colour-blind
   readers, screen-reader users and anyone printing in greyscale all still get
   the distinction — which matters more here than usual, because the difference
   between the two is the difference between "we can fill this" and "we legally
   cannot".
   ========================================================================= */

/**
 * Fills. The brief names #2456F7 / #69D8DF / #EDF1F7; these use the site's own
 * tokens, which are the same three roles a few percent apart — keeping the map
 * consistent with every other surface matters more than matching the brief's
 * hexes exactly.
 */
const STYLE: Record<
  LicenceStatus,
  { fill: string; stroke: string; dashed: boolean; label: string }
> = {
  licensed: {
    fill: "fill-brand-500",
    stroke: "stroke-brand-700",
    dashed: false,
    label: "fill-white",
  },
  pursuing: {
    fill: "fill-brand-500/20",
    stroke: "stroke-brand-500/60",
    dashed: true,
    label: "fill-brand-700",
  },
  none: {
    fill: "fill-[#EDF1F7]",
    stroke: "stroke-line",
    dashed: false,
    label: "fill-ink-soft",
  },
};

/**
 * States too small to hold a two-letter code inside their own outline.
 *
 * Printing one anyway is what produces the smear of overlapping type in the
 * north-east on every generic US map. These are identified by hover title and
 * by the written summary instead — the label is a convenience for scanning,
 * not the accessible name.
 */
const UNLABELLED = new Set([
  "RI", "DE", "DC", "CT", "NJ", "MA", "NH", "VT", "MD",
]);

/**
 * Nudges for labels that would otherwise collide with something.
 *
 * Florida is the only one today: its centroid is where the Tampa marker
 * goes, so the code and the dot were drawn on top of each other. The label
 * moves down the peninsula, which is empty.
 */
const LABEL_NUDGE: Record<string, { dx: number; dy: number }> = {
  FL: { dx: 12, dy: 26 },
};

export function CoverageMap({ className }: { className?: string }) {
  const { licensed, pursuing, licensedNames } = coverageCounts();

  // Geometry joined to status by postal code. The map is driven by
  // lib/coverage.ts; a shape with no entry there simply is not drawn, so the
  // two files cannot silently disagree about which states exist.
  const byCode = new Map(stateGrid.map((s) => [s.code, s]));

  return (
    <figure className={cn("not-prose", className)}>
      <svg
        viewBox={US_MAP_VIEWBOX}
        className="h-auto w-full"
        role="img"
        aria-labelledby="coverage-map-title coverage-map-desc"
      >
        <title id="coverage-map-title">
          MediCraft Pharmacy licensure by state
        </title>
        <desc id="coverage-map-desc">
          {`Licensed and able to dispense in ${licensedNames.join(", ")}. Licensure in progress in ${pursuing} further states, which cannot be served until a permit is granted.`}
        </desc>

        {US_STATE_SHAPES.map((shape) => {
          const state = byCode.get(shape.code);
          if (!state) return null;

          const style = STYLE[state.status];

          return (
            <path
              key={shape.code}
              d={shape.d}
              className={cn(style.fill, style.stroke)}
              strokeWidth={state.status === "licensed" ? 1.5 : 0.75}
              strokeDasharray={style.dashed ? "3 2.5" : undefined}
              // Every state is reachable by pointer, including the ones too
              // small to carry a printed label.
              aria-hidden
            >
              <title>{`${state.name} — ${LABEL_FOR[state.status]}`}</title>
            </path>
          );
        })}

        {/* Labels in a second pass, so no neighbouring state's fill can paint
            over a label drawn before it. */}
        {US_STATE_SHAPES.map((shape) => {
          const state = byCode.get(shape.code);
          if (!state || UNLABELLED.has(shape.code)) return null;

          return (
            <text
              key={shape.code}
              x={shape.cx + (LABEL_NUDGE[shape.code]?.dx ?? 0)}
              y={shape.cy + (LABEL_NUDGE[shape.code]?.dy ?? 0)}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                "pointer-events-none font-mono text-[11px] font-semibold",
                STYLE[state.status].label
              )}
              aria-hidden
            >
              {shape.code}
            </text>
          );
        })}

        {/* Tampa origin marker, on Florida. Brief §4.14 asks for a cyan
            dot with a soft radial pulse; the pulse is CSS so it can be switched
            off under prefers-reduced-motion. */}
        <Origin />
      </svg>

      {/* Legend. Spells out the consequence of each status rather than just
          naming it — "in progress" on its own reads to a prescriber as
          "available soon", which is not the same as "cannot be filled". */}
      <figcaption className="mt-7">
        <ul className="flex flex-wrap gap-x-7 gap-y-3">
          <LegendItem
            swatch="bg-brand-500"
            label={`Licensed — ${licensed} ${licensed === 1 ? "state" : "states"}`}
            note="Prescriptions filled today"
          />
          <LegendItem
            swatch="border-[1.5px] border-dashed border-brand-500/60 bg-brand-500/20"
            label={`In progress — ${pursuing} states`}
            note="Cannot be filled until the permit is granted"
          />
          <LegendItem
            swatch="bg-[#EDF1F7] border border-line"
            label="Not currently pursued"
            note=""
          />
        </ul>
      </figcaption>
    </figure>
  );
}

const LABEL_FOR: Record<LicenceStatus, string> = {
  licensed: "licensed, prescriptions filled today",
  pursuing: "licensure in progress, cannot be filled yet",
  none: "not currently pursued",
};

/** The Tampa dot, placed on Florida's own centroid. */
function Origin() {
  const fl = US_STATE_SHAPES.find((s) => s.code === "FL");
  if (!fl) return null;

  // Nudged west of the centroid: Florida's centroid sits where the panhandle
  // pulls it, and Tampa is on the Gulf coast below it. The label is
  // moved the other way (see LABEL_NUDGE) so the two do not overlap.
  const cx = fl.cx - 7;
  const cy = fl.cy + 9;

  return (
    <g className="origin-pulse" style={{ transformOrigin: `${cx}px ${cy}px` }} aria-hidden>
      <circle className="origin-pulse-ring" cx={cx} cy={cy} r={14} />
      <circle cx={cx} cy={cy} r={3.5} className="fill-cyan-400" />
    </g>
  );
}

function LegendItem({
  swatch,
  label,
  note,
}: {
  swatch: string;
  label: string;
  note: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span aria-hidden className={cn("mt-0.5 h-4 w-4 shrink-0 rounded-[3px]", swatch)} />
      <span>
        <span className="block text-meta font-bold text-ink">{label}</span>
        {note && <span className="block text-caption text-ink-muted">{note}</span>}
      </span>
    </li>
  );
}
