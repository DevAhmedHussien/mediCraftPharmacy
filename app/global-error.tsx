"use client";

/**
 * The last resort.
 *
 * `global-error.tsx` replaces the ROOT layout, so it cannot use the fonts,
 * the Tailwind layer, the Navbar or anything else the app normally provides —
 * it renders its own `<html>` and `<body>`. It only ever shows when the root
 * layout itself threw, which is the one failure mode no other boundary can
 * catch.
 *
 * That constraint is why the styles below are inline rather than classes:
 * at this point the stylesheet may be exactly what failed to load, and a
 * recovery page that depends on the thing that broke is not a recovery page.
 * The colours are the brand's, written out, because there is no token layer
 * to read them from.
 *
 * It says nothing about what went wrong. A stack trace or an error code here
 * tells an attacker about internals and tells a prescriber nothing; the
 * digest is logged server-side where it is useful.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f7f7f5",
          color: "#0d193e",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#1b54fb",
            }}
          >
            MediCraft Pharmacy
          </p>
          <h1
            style={{
              margin: "20px 0 0",
              fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.035em",
            }}
          >
            Something went wrong on our side.
          </h1>
          <p style={{ margin: "16px 0 0", fontSize: "17px", lineHeight: 1.6, color: "#46536f" }}>
            This is not a problem with your account, your prescription or your
            order. Try again, and if it keeps happening call the pharmacy on{" "}
            <a href="tel:+17273096666" style={{ color: "#1b54fb" }}>
              (727) 309-6666
            </a>
            .
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "28px",
              cursor: "pointer",
              border: 0,
              borderRadius: "999px",
              padding: "14px 26px",
              background: "#0d193e",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                margin: "24px 0 0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "11px",
                color: "#636e89",
              }}
            >
              Reference {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
