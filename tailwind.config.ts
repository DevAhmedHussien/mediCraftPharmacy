import type { Config } from "tailwindcss";

/* ---------------------------------------------------------------------------
   Color palettes.

   The whole site is built on the `brand-*` / `ink` / `sand` tokens, so the
   active palette is chosen by the `palettes` lookup below — swap ACTIVE_PALETTE
   between "blue" and "green" to change the entire theme.
--------------------------------------------------------------------------- */

const green = {
  brand: {
    50: "#eefaf6",
    100: "#d5f2e7",
    200: "#aee5d2",
    300: "#79d1b6",
    400: "#42b795",
    500: "#1f9c7c",
    600: "#137d65",
    700: "#116453",
    800: "#125044",
    900: "#11423a",
    950: "#062621",
  },
  ink: {
    DEFAULT: "#0f1c1a",
    soft: "#3b4a47",
    muted: "#6b7a76",
  },
  sand: "#f7f5f0",
  line: "#dfe5e2",
};

/**
 * Apple's system palette, blue-led. Values are the real ones Apple ships:
 * #0071e3 is the button blue, #0066cc the link blue, #1d1d1f / #6e6e73 /
 * #86868b the text ramp, #f5f5f7 the alternating section grey, and #d2d2d7
 * the hairline rule. The tint steps below 500 are interpolated to fill out
 * the scale the components already reference.
 */
const blue = {
  brand: {
    50: "#f5faff",
    100: "#e8f3ff",
    200: "#cce4ff",
    300: "#9ccbff",
    400: "#5aabfa",
    500: "#0071e3",
    600: "#0066cc",
    700: "#0055ab",
    800: "#00458c",
    900: "#003a75",
    950: "#001e3d",
  },
  ink: {
    DEFAULT: "#1d1d1f",
    soft: "#6e6e73",
    muted: "#86868b",
  },
  sand: "#f5f5f7",
  line: "#d2d2d7",
};

const palettes = { blue, green };

// Change this to "green" to restore the original palette.
const ACTIVE_PALETTE: keyof typeof palettes = "blue";

const palette = palettes[ACTIVE_PALETTE];

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: palette.brand,
        ink: palette.ink,
        sand: palette.sand,
        line: palette.line,
        // Both palettes stay addressable directly, e.g. `text-green-brand-600`.
        "blue-brand": blue.brand,
        "green-brand": green.brand,
      },
      fontFamily: {
        // One family for everything, the way Apple ships SF Pro. `display` is
        // kept as an alias so existing markup keeps working.
        sans: ["var(--font-sans)"],
        display: ["var(--font-sans)"],
      },
      fontSize: {
        // Apple's type ramp. Each entry pairs size with the line-height and
        // negative tracking Apple actually uses at that size.
        caption: ["0.75rem", { lineHeight: "1.33", letterSpacing: "-0.01em" }],
        meta: ["0.875rem", { lineHeight: "1.43", letterSpacing: "-0.016em" }],
        body: ["1.0625rem", { lineHeight: "1.47", letterSpacing: "-0.022em" }],
        intro: ["1.3125rem", { lineHeight: "1.38", letterSpacing: "-0.021em" }],
        "display-sm": ["2rem", { lineHeight: "1.125", letterSpacing: "-0.02em" }],
        "display-md": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.021em" }],
        "display-lg": ["3rem", { lineHeight: "1.0834", letterSpacing: "-0.023em" }],
        "display-xl": ["3.5rem", { lineHeight: "1.0715", letterSpacing: "-0.025em" }],
        "display-2xl": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.028em" }],
      },
      borderRadius: {
        // Apple's two structural radii: 18px tiles, 28px large panels.
        tile: "1.125rem",
        panel: "1.75rem",
      },
      container: {
        center: true,
        padding: "1.5rem",
        screens: {
          "2xl": "1440px",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease forwards",
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
