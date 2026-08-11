import { cn } from "@/lib/utils";

/* ===========================================================================
   The MediCraft mark — Option 2 from the identity deck.

   Every coordinate below is lifted from the vector data in "medicraft logo
   options wave 2 + colors options.pdf" (page 11), not redrawn by eye. The
   deck's artboard coordinates are translated by (-365.082, -249.168) so the
   mark's bounding box starts at the origin; nothing is scaled, so the
   proportions are the designer's exactly.

   The mark is a mortar and pestle that doubles as the "M" of MediCraft:

     · bowl — a ring segment, outer r 38.05 / inner r 28.27 about (44.75,
       24.45), with two legs flaring below it. The dip between the legs reads
       as the M's centre vee.
     · pestle — a tapered handle plus a rounded knob, entering the bowl at
       its centre.
     · mouth — a flattened ellipse (rx 25.33, ry 4.55) painted last, so it
       covers the junction where the pestle meets the bowl. That overlap is
       what makes the pestle read as *inside* the mortar, and it is also what
       lets the pestle rotate without its tip ever appearing to detach.

   The wordmark is set as outlines rather than live text. A logo should not
   change shape if a webfont fails, and the deck's letterfit (Satoshi Black
   for "edi", Satoshi Regular for "Craft" and "Pharmacy") is preserved to the
   unit. Note that the mark *is* the M — the text alongside it begins at "edi"
   — so the accessible name is supplied once, on the wrapper.
   ========================================================================= */

/** Animation behaviour. `load` assembles the mark once on mount; `grind` runs
 *  a continuous stir, for oversized display use only; `none` renders static. */
type Animate = "load" | "grind" | "none";

/** `invert` is the reversed mark for navy and photographic grounds: the bowl
 *  and wordmark go white while the pestle keeps its cyan, exactly as the deck
 *  specifies. */
type Tone = "light" | "invert";

function markFills(tone: Tone) {
  return {
    bowl: tone === "invert" ? "fill-white" : "fill-brand-500",
    pestle: "fill-cyan-400",
  };
}

/* --- Geometry, shared by the mark-only and full-lockup renderings --------- */

const BOWL_D =
  "M 79.640625 62.425781 L 76.597657 45.160156 C 75.164063 47.351562 73.496094 49.410156 71.601563 51.304687 " +
  "C 64.429688 58.476562 54.894531 62.425781 44.75 62.425781 C 34.605469 62.425781 25.070313 58.476562 17.894531 51.304687 " +
  "C 16.003907 49.410156 14.332031 47.351562 12.902344 45.160156 L 9.859375 62.425781 L 0 62.425781 " +
  "L 6.699219 24.449219 L 16.480469 24.449219 C 16.480469 40.039062 29.160157 52.71875 44.75 52.71875 " +
  "C 60.335938 52.71875 73.019531 40.039062 73.019531 24.449219 L 82.800781 24.449219 L 89.496094 62.425781 Z";

/** The pestle's rounded knob. */
const KNOB_D =
  "M 63.699219 1.125 C 62.964844 2.253906 63.832031 4.125 65.640625 5.300781 " +
  "C 67.449219 6.480469 69.507813 6.523437 70.246094 5.394531 C 70.980469 4.265625 64.433594 0 63.699219 1.125";

/** The tapered handle — wide where it sits in the bowl, narrow at the knob. */
const HANDLE_D =
  "M 68.980469 4.570312 L 64.960938 1.949219 L 44.75 26.375 L 59.882813 22.734375 Z";

const MOUTH = { cx: 44.748, cy: 24.027, rx: 25.326, ry: 4.547 };

/**
 * The mark on its own, without the wordmark. Used for the favicon, the app
 * icon, and anywhere the name is already present in the surrounding copy.
 */
export function LogoMark({
  className,
  tone = "light",
  animate = "none",
}: {
  className?: string;
  tone?: Tone;
  animate?: Animate;
}) {
  const fill = markFills(tone);

  return (
    <svg
      viewBox="0 0 89.5 62.43"
      className={cn("logo-mark h-8 w-auto", className)}
      data-animate={animate}
      aria-hidden="true"
      focusable="false"
    >
      <path className={cn("logo-bowl", fill.bowl)} d={BOWL_D} />
      <g className={cn("logo-pestle", fill.pestle)}>
        <path d={KNOB_D} />
        <path d={HANDLE_D} />
      </g>
      <ellipse className={cn("logo-mouth", fill.pestle)} {...MOUTH} />
    </svg>
  );
}

/* --- Wordmark outlines ---------------------------------------------------
   Glyph paths as embedded in the deck, each drawn on its own baseline at
   y = 0 and placed by the `<use>` offsets below. "a" appears twice in
   "Pharmacy", which is why these live in <defs>.
   ---------------------------------------------------------------------- */

const GLYPHS: Record<string, string> = {
  // Satoshi Black — "edi"
  e:
    "M 14.90625 0.671875 C 21.9375 0.671875 27.03125 -2.984375 27.953125 -8.6875 L 20.703125 -8.6875 " +
    "C 20.140625 -6.828125 18.03125 -5.75 15.0625 -5.75 C 11.5625 -5.75 9.65625 -7.34375 9.203125 -10.734375 " +
    "L 27.859375 -10.84375 L 27.859375 -12.84375 C 27.859375 -21.21875 22.8125 -26.515625 14.75 -26.515625 " +
    "C 6.984375 -26.515625 1.59375 -20.921875 1.59375 -12.90625 C 1.59375 -4.984375 7.140625 0.671875 14.90625 0.671875 Z " +
    "M 14.796875 -20.09375 C 17.984375 -20.09375 19.984375 -18.34375 19.984375 -15.625 L 9.296875 -15.625 " +
    "C 9.921875 -18.703125 11.671875 -20.09375 14.796875 -20.09375 Z",
  d:
    "M 13.765625 0.671875 C 17.46875 0.671875 20.65625 -0.921875 22.046875 -3.28125 L 22.453125 0 L 29.90625 0 " +
    "L 29.90625 -38.75 L 22 -38.75 L 22 -23.328125 C 20.5 -25.234375 17.46875 -26.515625 14.28125 -26.515625 " +
    "C 6.46875 -26.515625 1.59375 -20.859375 1.59375 -12.6875 C 1.59375 -4.578125 6.375 0.671875 13.765625 0.671875 Z " +
    "M 15.671875 -6.578125 C 11.921875 -6.578125 9.5625 -9.203125 9.5625 -13 C 9.5625 -16.8125 11.921875 -19.421875 15.671875 -19.421875 " +
    "C 19.375 -19.421875 21.9375 -16.859375 21.9375 -13 C 21.9375 -9.140625 19.375 -6.578125 15.671875 -6.578125 Z",
  i:
    "M 6.890625 -29.703125 C 9.359375 -29.703125 11.359375 -31.703125 11.359375 -34.21875 " +
    "C 11.359375 -36.75 9.359375 -38.703125 6.890625 -38.703125 C 4.375 -38.703125 2.359375 -36.75 2.359375 -34.21875 " +
    "C 2.359375 -31.703125 4.375 -29.703125 6.890625 -29.703125 Z M 2.984375 0 L 10.890625 0 L 10.890625 -25.703125 L 2.984375 -25.703125 Z",

  // Satoshi Regular — "Craft"
  C:
    "M 19.484375 0.5625 C 27.390625 0.5625 33.8125 -4.109375 35.515625 -11.046875 L 31.546875 -11.046875 " +
    "C 29.953125 -6.109375 25.328125 -2.984375 19.53125 -2.984375 C 11.453125 -2.984375 6.0625 -9.140625 6.0625 -18.390625 " +
    "C 6.0625 -27.703125 11.453125 -33.859375 19.53125 -33.859375 C 25.28125 -33.859375 29.8125 -30.625 31.34375 -25.328125 " +
    "L 35.3125 -25.328125 C 33.8125 -32.640625 27.59375 -37.40625 19.6875 -37.40625 C 9.296875 -37.40625 2.203125 -29.703125 2.203125 -18.390625 " +
    "C 2.203125 -7.09375 9.203125 0.5625 19.484375 0.5625 Z",
  r:
    "M 16.703125 -25.1875 C 15.828125 -25.390625 15.15625 -25.4375 14.390625 -25.4375 C 10.890625 -25.4375 8.28125 -23.6875 7.296875 -21.015625 " +
    "L 7.046875 -24.875 L 3.703125 -24.875 L 3.703125 0 L 7.25 0 L 7.25 -14.1875 C 7.25 -18.90625 10.171875 -22 14.75 -22 L 16.703125 -22 Z",
  a:
    "M 10.84375 0.609375 C 15.0625 0.609375 18.453125 -1.234375 19.984375 -4.375 L 20.453125 0 L 23.4375 0 " +
    "L 23.4375 -16.078125 C 23.4375 -22.65625 19.21875 -25.546875 13.46875 -25.546875 C 7.34375 -25.546875 3.234375 -22.296875 3.234375 -17.265625 " +
    "L 6.46875 -17.265625 C 6.46875 -20.609375 9.046875 -22.5625 13.359375 -22.5625 C 17.015625 -22.5625 19.9375 -21.015625 19.9375 -16.140625 " +
    "L 19.9375 -15.3125 L 11.71875 -14.640625 C 5.90625 -14.1875 2.421875 -11.3125 2.421875 -6.734375 C 2.421875 -2.359375 5.546875 0.609375 10.84375 0.609375 Z " +
    "M 11.671875 -2.265625 C 8.28125 -2.265625 6.015625 -3.796875 6.015625 -6.828125 C 6.015625 -9.609375 7.921875 -11.671875 12.59375 -12.078125 " +
    "L 19.9375 -12.640625 L 19.9375 -11.3125 C 19.9375 -5.90625 16.90625 -2.265625 11.671875 -2.265625 Z",
  f:
    "M 0.921875 -24.875 L 0.921875 -21.890625 L 4.734375 -21.890625 L 4.734375 0 L 8.28125 0 L 8.28125 -21.890625 " +
    "L 14.125 -21.890625 L 14.125 -24.875 L 8.28125 -24.875 L 8.28125 -29.703125 C 8.28125 -32.640625 9.09375 -34.21875 12.234375 -34.21875 " +
    "L 14.34375 -34.21875 L 14.34375 -37.265625 C 13.515625 -37.40625 12.484375 -37.46875 11.609375 -37.46875 " +
    "C 7.8125 -37.46875 4.734375 -35.3125 4.734375 -29.703125 L 4.734375 -24.875 Z",
  t:
    "M 9.40625 0 L 9.40625 -21.890625 L 14.390625 -21.890625 L 14.390625 -24.875 L 9.40625 -24.875 L 9.40625 -32.734375 " +
    "L 5.90625 -32.734375 L 5.90625 -24.875 L 0.921875 -24.875 L 0.921875 -21.890625 L 5.90625 -21.890625 L 5.90625 0 Z",

  // Satoshi Regular, smaller — "Pharmacy"
  P2:
    "M 8.875 -6.484375 C 12.25 -6.484375 14.421875 -8.90625 14.421875 -12.109375 C 14.421875 -15.4375 12.28125 -17.65625 8.875 -17.65625 " +
    "L 2.140625 -17.65625 L 2.140625 0 L 3.921875 0 L 3.921875 -6.484375 Z M 8.625 -16.046875 " +
    "C 11.078125 -16.046875 12.578125 -14.578125 12.578125 -12.125 C 12.578125 -9.71875 11.09375 -8.09375 8.53125 -8.09375 L 3.921875 -8.09375 L 3.921875 -16.046875 Z",
  h2:
    "M 3.46875 -0.03125 L 3.46875 -6.515625 C 3.46875 -8.796875 4.8125 -10.703125 7.375 -10.703125 " +
    "C 9.21875 -10.703125 10.53125 -9.71875 10.53125 -6.921875 L 10.53125 0 L 12.234375 0 L 12.234375 -7.296875 " +
    "C 12.234375 -10.3125 10.828125 -12.25 7.6875 -12.25 C 5.703125 -12.25 4.234375 -11.296875 3.46875 -9.859375 " +
    "L 3.46875 -17.96875 L 1.78125 -17.96875 L 1.78125 -0.03125 Z",
  a2:
    "M 5.203125 0.296875 C 7.21875 0.296875 8.859375 -0.59375 9.59375 -2.09375 L 9.8125 0 L 11.25 0 L 11.25 -7.71875 " +
    "C 11.25 -10.875 9.21875 -12.25 6.453125 -12.25 C 3.53125 -12.25 1.546875 -10.703125 1.546875 -8.28125 L 3.109375 -8.28125 " +
    "C 3.109375 -9.890625 4.34375 -10.828125 6.40625 -10.828125 C 8.15625 -10.828125 9.5625 -10.078125 9.5625 -7.734375 L 9.5625 -7.34375 " +
    "L 5.625 -7.03125 C 2.828125 -6.8125 1.15625 -5.421875 1.15625 -3.234375 C 1.15625 -1.140625 2.65625 0.296875 5.203125 0.296875 Z " +
    "M 5.59375 -1.078125 C 3.96875 -1.078125 2.890625 -1.828125 2.890625 -3.28125 C 2.890625 -4.609375 3.796875 -5.59375 6.046875 -5.796875 " +
    "L 9.5625 -6.0625 L 9.5625 -5.421875 C 9.5625 -2.828125 8.109375 -1.078125 5.59375 -1.078125 Z",
  r2:
    "M 8.015625 -12.078125 C 7.59375 -12.1875 7.28125 -12.203125 6.90625 -12.203125 C 5.234375 -12.203125 3.96875 -11.359375 3.5 -10.078125 " +
    "L 3.375 -11.9375 L 1.78125 -11.9375 L 1.78125 0 L 3.46875 0 L 3.46875 -6.8125 C 3.46875 -9.078125 4.875 -10.546875 7.078125 -10.546875 L 8.015625 -10.546875 Z",
  m2:
    "M 3.46875 0 L 3.46875 -7.390625 C 3.46875 -9.21875 4.6875 -10.703125 6.6875 -10.703125 C 8.484375 -10.703125 9.640625 -9.515625 9.640625 -7.5 " +
    "L 9.640625 0 L 11.3125 0 L 11.3125 -7.375 C 11.3125 -9.21875 12.5 -10.71875 14.5 -10.71875 C 16.328125 -10.71875 17.453125 -9.515625 17.453125 -7.46875 " +
    "L 17.453125 0 L 19.109375 0 L 19.109375 -7.8125 C 19.109375 -10.578125 17.40625 -12.25 14.8125 -12.25 " +
    "C 12.890625 -12.25 11.4375 -11.265625 10.890625 -9.71875 C 10.328125 -11.265625 8.921875 -12.25 7.046875 -12.25 " +
    "C 5.375 -12.25 4.046875 -11.484375 3.453125 -10.234375 L 3.25 -11.9375 L 1.78125 -11.9375 L 1.78125 0 Z",
  c2:
    "M 0.9375 -5.9375 C 0.9375 -2.1875 3.234375 0.296875 6.609375 0.296875 C 9.3125 0.296875 11.4375 -1.3125 12 -3.75 " +
    "L 10.28125 -3.75 C 9.8125 -2.21875 8.390625 -1.234375 6.609375 -1.234375 C 4.1875 -1.234375 2.609375 -3.125 2.609375 -5.96875 " +
    "C 2.609375 -8.90625 4.3125 -10.75 6.734375 -10.75 C 8.390625 -10.75 9.8125 -9.84375 10.25 -8.1875 L 11.953125 -8.1875 " +
    "C 11.484375 -10.65625 9.46875 -12.25 6.703125 -12.25 C 3.234375 -12.25 0.9375 -9.6875 0.9375 -5.9375 Z",
  y2:
    "M 0.5625 5.203125 C 1.109375 5.328125 1.65625 5.375 2.359375 5.375 C 4.0625 5.375 5.234375 4.609375 5.921875 2.734375 " +
    "L 11.390625 -11.9375 L 9.640625 -11.9375 L 5.875 -1.53125 L 2.015625 -11.9375 L 0.21875 -11.9375 L 5.046875 0.71875 " +
    "L 4.53125 2.125 C 3.9375 3.71875 2.90625 3.796875 1.875 3.796875 L 0.5625 3.796875 Z",
};

/** Baseline for "ediCraft", in mark-local units — the same line the M's legs
 *  land on, which is why the mark needs no vertical nudging. */
const ROW1_Y = 62.426;
/** Baseline for "Pharmacy". */
const ROW2_Y = 89.758;

/** Glyph placements, x-offsets straight from the deck's letterfit. */
const ROW1: [string, number][] = [
  ["e", 90.808],
  ["d", 120.362],
  ["i", 153.257],
  ["C", 167.134],
  ["r", 204.603],
  ["a", 221.308],
  ["f", 247.932],
  ["t", 263.197],
];

const ROW2: [string, number][] = [
  ["P2", 169.416],
  ["h2", 184.552],
  ["a2", 198.406],
  ["r2", 211.275],
  ["m2", 219.779],
  ["a2", 240.536],
  ["c2", 253.404],
  ["y2", 265.977],
];

/**
 * The full lockup: mark plus "ediCraft" over "Pharmacy".
 *
 * Sized by height alone (`h-*`) — the viewBox keeps the aspect ratio, so the
 * mark, the letterfit and the two baselines can never drift apart. Pass
 * `animate="load"` where the lockup should assemble on mount, and wrap the
 * link in `.logo-lockup` (done here) so hover and keyboard focus drive the
 * grind.
 */
export function Logo({
  className,
  tone = "light",
  animate = "load",
}: {
  className?: string;
  tone?: Tone;
  animate?: Animate;
}) {
  const fill = markFills(tone);
  const type = tone === "invert" ? "fill-white" : "fill-brand-500";

  // Distinct ids per tone so two lockups on one page (header + footer) cannot
  // collide in the document's id space.
  const ns = `mc-${tone}`;

  return (
    <svg
      viewBox="0 0 277.6 95.2"
      className={cn("logo-mark h-9 w-auto", className)}
      data-animate={animate}
      role="img"
      aria-label="MediCraft Pharmacy"
    >
      <defs>
        {Object.entries(GLYPHS).map(([key, d]) => (
          <path key={key} id={`${ns}-${key}`} d={d} />
        ))}
      </defs>

      {/* --- Mark: bowl, pestle, then mouth over the junction --- */}
      <path className={cn("logo-bowl", fill.bowl)} d={BOWL_D} />
      <g className={cn("logo-pestle", fill.pestle)}>
        <path d={KNOB_D} />
        <path d={HANDLE_D} />
      </g>
      <ellipse className={cn("logo-mouth", fill.pestle)} {...MOUTH} />

      {/* --- Wordmark --- */}
      <g className={type}>
        {ROW1.map(([key, x], i) => (
          <use key={`r1-${i}`} href={`#${ns}-${key}`} x={x} y={ROW1_Y} />
        ))}
        {ROW2.map(([key, x], i) => (
          <use key={`r2-${i}`} href={`#${ns}-${key}`} x={x} y={ROW2_Y} />
        ))}
      </g>
    </svg>
  );
}
