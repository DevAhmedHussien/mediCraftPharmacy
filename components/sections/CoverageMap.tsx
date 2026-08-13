import {
  GRID_COLS,
  GRID_ROWS,
  coverageCounts,
  stateGrid,
  type LicenceStatus,
} from "@/lib/coverage";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Licensure map.

   Brief §4.14: no stock US map, and this must be "a data-driven SVG the team can
   update without a designer" delivered "as a component, not a flat image". So it
   renders from lib/coverage.ts — flip a status there and the map, legend and
   counts all follow.

   Status is never carried by colour alone. A solid fill also gets a solid
   border; a pending state gets a dashed one; and the accessible summary below
   the map states the position in words. Colour-blind readers, screen-reader
   users and anyone printing in greyscale all still get the distinction — which
   matters more here than usual, because the difference between the two is the
   difference between "we can fill this" and "we legally cannot".
   ========================================================================= */

/** Tile geometry, in SVG user units. */
const TILE = 34;
const GAP = 4;
const PITCH = TILE + GAP;

const W = GRID_COLS * PITCH - GAP;
const H = GRID_ROWS * PITCH - GAP;

/**
 * Fills. The brief names #2456F7 / #69D8DF / #EDF1F7; these use the site's own
 * tokens, which are the same three roles a few percent apart — keeping the map
 * consistent with every other surface matters more than matching the brief's
 * hexes exactly. See the note in the handover about which palette is canonical.
 */
const STYLE: Record<
  LicenceStatus,
  { fill: string; stroke: string; dashed: boolean; label: string }
> = {
  licensed: {
    fill: "fill-brand-500",
    stroke: "stroke-brand-600",
    dashed: false,
    label: "text-white",
  },
  pursuing: {
    fill: "fill-brand-500/25",
    stroke: "stroke-brand-500/70",
    dashed: true,
    label: "text-brand-700",
  },
  none: {
    fill: "fill-[#EDF1F7]",
    stroke: "stroke-line",
    dashed: false,
    // ink-soft, not ink-muted: at 11px on the pale tile the muted grey measured
    // 4.49:1, a hair under AA. This clears it at 6.9:1.
    label: "text-ink-soft",
  },
};

export function CoverageMap({ className }: { className?: string }) {
  const { licensed, pursuing, licensedNames } = coverageCounts();

  return (
    <figure className={cn("not-prose", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
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

        {stateGrid.map((s) => {
          const style = STYLE[s.status];
          const x = s.col * PITCH;
          const y = s.row * PITCH;

          return (
            <g key={s.code}>
              <rect
                x={x}
                y={y}
                width={TILE}
                height={TILE}
                rx={5}
                className={cn(style.fill, style.stroke)}
                strokeWidth={1.5}
                // The dash is the non-colour carrier of "pending".
                strokeDasharray={style.dashed ? "3 2.5" : undefined}
              />
              <text
                x={x + TILE / 2}
                y={y + TILE / 2}
                textAnchor="middle"
                dominantBaseline="central"
                // 11px in a 34px tile — small, but these are two-letter codes
                // and the mono face keeps them even.
                className={cn(
                  "font-mono text-[11px] font-semibold",
                  style.label
                )}
                fill="currentColor"
              >
                {s.code}
              </text>
            </g>
          );
        })}

        {/* Palm Harbor origin marker, on Florida. Brief §4.14 asks for a cyan
            dot with a soft radial pulse; the pulse is CSS so it can be switched
            off under prefers-reduced-motion. */}
        {(() => {
          const fl = stateGrid.find((s) => s.code === "FL");
          if (!fl) return null;
          const cx = fl.col * PITCH + TILE / 2;
          const cy = fl.row * PITCH + TILE / 2;
          return (
            <g className="origin-pulse" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle className="origin-pulse-ring" cx={cx} cy={cy} r={TILE / 2} />
              <circle cx={cx} cy={cy} r={3.5} className="fill-cyan-400" />
            </g>
          );
        })()}
      </svg>

      {/* Legend. Spells out the consequence of each status rather than just
          naming it — "in progress" on its own reads to a prescriber as
          "available soon", which is not the same as "cannot be filled". */}
      <figcaption className="mt-7">
        <ul className="flex flex-wrap gap-x-7 gap-y-3">
          <LegendItem
            swatch="bg-brand-500"
            label={`Licensed — ${licensed} state`}
            note="Prescriptions filled today"
          />
          <LegendItem
            swatch="border-[1.5px] border-dashed border-brand-500/70 bg-brand-500/25"
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
