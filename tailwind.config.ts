import type { Config } from "tailwindcss";

/* ---------------------------------------------------------------------------
   MediCraft design tokens.

   Every colour below is measured from the identity deck — "medicraft logo
   options wave 2 + colors options.pdf", Option 2 — rather than eyeballed, so
   the site and the printed identity are the same brand:

     blue  #1B54FB   rgb(10.598755%, 32.899475%, 98.399353%)   the "M" mortar
     cyan  #23DCE1   rgb(13.699341%, 86.299133%, 88.198853%)   the pestle
     navy  #0D193E   rgb(5.099487%,  9.799194%,  24.299622%)   dark grounds

   The `brand` / `ink` / `sand` / `line` token names are carried over from the
   previous palette so existing markup keeps resolving; what they point at has
   changed. `brand-500` is the exact logo blue and `brand-950` the exact navy,
   which is what makes a hero gradient built from the scale land on brand
   colour at both ends.
--------------------------------------------------------------------------- */

const brand = {
  50: "#f0f4ff",
  100: "#dfe9ff",
  200: "#c2d5ff",
  300: "#9bb8ff",
  400: "#6b90ff",
  500: "#1b54fb", // exact — logo blue
  600: "#1544d4",
  700: "#1236a8",
  800: "#152f83",
  900: "#152b68",
  950: "#0d193e", // exact — brand navy
};

/**
 * The pestle cyan. `400` is the exact artwork value; it is brilliant enough
 * that it only works as a fill or as type on navy. `700` is the darkened step
 * that clears 4.5:1 on white, so anything cyan that has to be *read* on a
 * light background uses that instead.
 */
const cyan = {
  50: "#eafcfd",
  100: "#c9f7f9",
  200: "#9deff3",
  300: "#5fe4ea",
  400: "#23dce1", // exact — pestle cyan
  500: "#0fbcc4",
  600: "#0c959d",
  700: "#0b6e74", // accessible on white
  800: "#0d585e",
  900: "#0f484e",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand,
        cyan,
        navy: {
          DEFAULT: "#0d193e",
          deep: "#070f26", // the dark end of hero / footer gradients
          soft: "#1b2c58", // hairlines and raised panels inside navy bands
        },
        /* Text ramp. Pulled toward the brand navy rather than neutral grey, so
           even body copy carries a trace of the identity's hue.
           `muted` is set at the darkest value that still reads as a third
           step: it clears 4.5:1 on white *and* on the sand band (4.80 / 4.51).
           A lighter grey looked better in isolation but failed on the band,
           where most of the captions on this site actually sit. */
        ink: {
          DEFAULT: "#0f1a33",
          soft: "#46536f",
          muted: "#636e89",
        },
        /* The alternating section band — a grey cooled toward blue so it sits
           under the palette instead of beside it. */
        sand: "#f5f8fd",
        line: "#dde4f0",
      },
      fontFamily: {
        // Satoshi is the identity typeface; the deck sets the lockup in
        // Satoshi Black over Satoshi Regular and the site does the same.
        sans: ["var(--font-satoshi)", "system-ui", "sans-serif"],
        display: ["var(--font-satoshi)", "system-ui", "sans-serif"],
        // Reserved for regulatory micro-data — USP chapters, lot numbers,
        // beyond-use dates. Never for prose.
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        /* Micro-label — the vial-label register: tracked out, uppercase. */
        label: ["0.6875rem", { lineHeight: "1.2", letterSpacing: "0.14em" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0" }],
        meta: ["0.875rem", { lineHeight: "1.6", letterSpacing: "-0.006em" }],
        body: ["1.0625rem", { lineHeight: "1.65", letterSpacing: "-0.011em" }],
        intro: ["1.25rem", { lineHeight: "1.6", letterSpacing: "-0.015em" }],
        /* Display sizes assume Satoshi Black; the tracking tightens as the
           size grows, which is how the lockup is drawn. */
        "display-sm": ["1.75rem", { lineHeight: "1.18", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.12", letterSpacing: "-0.025em" }],
        "display-lg": ["2.875rem", { lineHeight: "1.08", letterSpacing: "-0.03em" }],
        "display-xl": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.033em" }],
        "display-2xl": ["4.25rem", { lineHeight: "1.02", letterSpacing: "-0.036em" }],
      },
      borderRadius: {
        tile: "0.875rem",
        panel: "1.5rem",
      },
      boxShadow: {
        // Shadows are tinted with the navy rather than black, so cards sit in
        // the same light as everything else.
        card: "0 1px 2px rgba(13,25,62,0.04), 0 8px 24px rgba(13,25,62,0.06)",
        lift: "0 2px 4px rgba(13,25,62,0.05), 0 18px 44px rgba(13,25,62,0.11)",
        bar: "0 1px 0 rgba(13,25,62,0.06), 0 6px 20px rgba(13,25,62,0.05)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },

        /* ---- Logo motion ----------------------------------------------
           The mark is a mortar and pestle, so it animates the way one is
           actually used: the pestle drops in and grinds. Rotation happens
           about the point where the pestle meets the bowl, which the mouth
           ellipse covers — so the tip stays visually anchored while the
           handle sweeps. Angles are small on purpose; a big sweep reads as
           a windmill rather than grinding. */
        /* Lifted clear of the bowl, then plunged in and settled. Negative
           rotation raises the handle toward vertical, positive lowers it —
           so the sequence is lift, strike, rebound, rest. */
        "pestle-drop": {
          "0%": { opacity: "0", transform: "rotate(-24deg) translateY(-4px)" },
          "55%": { opacity: "1", transform: "rotate(5deg)" },
          "78%": { transform: "rotate(-3deg)" },
          "100%": { opacity: "1", transform: "rotate(0deg)" },
        },
        "pestle-grind": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-7deg)" },
          "75%": { transform: "rotate(7deg)" },
        },
        /* The mouth widens as the pestle lands — the surface reacting. */
        "mouth-settle": {
          "0%": { opacity: "0", transform: "scaleX(0.35) scaleY(0.4)" },
          "60%": { opacity: "1", transform: "scaleX(1.04) scaleY(1.25)" },
          "100%": { opacity: "1", transform: "scaleX(1) scaleY(1)" },
        },
        "mouth-ripple": {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.22)" },
        },
        /* The Palm Harbor origin marker on the coverage map: a ring that
           expands out of the dot and fades. Scale + opacity only. */
        "origin-pulse": {
          "0%": { transform: "scale(0.35)", opacity: "0.75" },
          "70%": { opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        "bowl-rise": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
        marquee: "marquee 34s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
