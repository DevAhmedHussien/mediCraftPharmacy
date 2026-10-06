import { cn } from "@/lib/utils";

/* ===========================================================================
   Material path — receipt to release, as a process schematic.

   The quality page argues two things in prose that a reader has to hold in
   their head at once: that raw material is vetted on the way in, and that
   finished product is tested on the way out. Drawn as one line, the shape of
   the argument becomes visible — material passes four gates before it is a
   compound and four more before it ships, and every gate can send it sideways.

   The reject branch is the point of the drawing. A process diagram where
   everything flows forward illustrates an intention; one that draws where
   failure goes illustrates a system. The copy already commits to this —
   "Product that doesn't meet specification is rejected and destroyed — not
   released, not repriced, not shipped" — so the branch is not an embellishment,
   it is the sentence.
   ========================================================================= */

type Gate = {
  id: string;
  label: string;
  /** The check performed. Kept to a few words — this is a diagram, not prose. */
  check: string;
};

const INBOUND: Gate[] = [
  { id: "sup", label: "Supplier", check: "FDA-registered, qualified" },
  { id: "coa", label: "COA review", check: "Against specification" },
  { id: "id", label: "Identity test", check: "On receipt, validated method" },
  { id: "pot", label: "Potency & purity", check: "Third-party lab" },
];

const OUTBOUND: Gate[] = [
  { id: "com", label: "Compounded", check: "ISO 5 primary control" },
  { id: "ster", label: "Sterility", check: "USP <71>" },
  { id: "endo", label: "Endotoxin", check: "LAL, injectables" },
  { id: "rel", label: "Pharmacist release", check: "Full batch record" },
];

export function ProcessSequence({ className }: { className?: string }) {
  return (
    <figure className={cn("not-prose", className)}>
      <div className="rounded-panel border border-line bg-sand p-6 md:p-8">
        <Track
          phase="Inbound — raw material"
          gates={INBOUND}
          terminal="Released to cleanroom"
        />

        <div className="my-7 border-t border-dashed border-line" />

        <Track
          phase="Outbound — finished product"
          gates={OUTBOUND}
          terminal="Shipped to patient"
        />

        {/* ---- The reject path ---- */}
        <div className="mt-7 flex items-start gap-3 rounded-tile border border-warning-fg/35/60 bg-warning-bg px-5 py-4">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-5 w-5 shrink-0 text-warning-fg"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 3v9m0 4v.5" />
            <path d="M10.3 3.9 2.6 17.2A1.6 1.6 0 0 0 4 19.6h16a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0z" />
          </svg>
          <p className="text-meta text-ink-soft text-pretty">
            <strong className="font-bold text-ink">Any gate can reject.</strong>{" "}
            A non-conforming lot is quarantined and destroyed — not released, not
            repriced, not shipped. Nothing moves to the next gate on a pending
            result.
          </p>
        </div>
      </div>
    </figure>
  );
}

function Track({
  phase,
  gates,
  terminal,
}: {
  phase: string;
  gates: Gate[];
  terminal: string;
}) {
  return (
    <div>
      <p className="font-mono text-label uppercase tracking-[0.14em] text-cyan-700">
        {phase}
      </p>

      {/* Horizontal on wide screens, vertical stack on narrow — a process line
          that scrolls sideways on a phone is a process line nobody reads. */}
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {gates.map((g, i) => (
          <li key={g.id} className="relative">
            <div className="h-full rounded-tile border border-line bg-white p-4">
              <div className="flex items-baseline gap-2">
                {/* Numbered because this genuinely is a sequence — each gate is
                    passed in order and none can be skipped. */}
                <span className="font-mono text-caption font-medium text-brand-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h4 className="text-meta font-bold text-ink">{g.label}</h4>
              </div>
              <p className="mt-1 text-caption text-ink-muted text-pretty">
                {g.check}
              </p>
            </div>

            {/* Connector into the next gate. Hidden on the last cell and on
                stacked layouts, where the reading order already implies it. */}
            {i < gates.length - 1 && (
              <span
                aria-hidden
                className="absolute right-[-0.6rem] top-1/2 hidden h-px w-3 -translate-y-1/2 bg-line lg:block"
              />
            )}
          </li>
        ))}
      </ol>

      <p className="mt-3 flex items-center gap-2 text-caption font-medium text-ink-soft">
        <span aria-hidden className="h-px w-6 bg-cyan-500" />
        {terminal}
      </p>
    </div>
  );
}
