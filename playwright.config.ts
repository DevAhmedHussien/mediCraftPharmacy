import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end gates.
 *
 * These exist because the audit in docs/audit-report.md was produced entirely
 * by hand: every Lighthouse score, every axe result, every SEO check was a
 * one-off measurement that nothing would catch regressing. The specs here are
 * those measurements, written down so they run on every pull request.
 *
 * AGAINST A PRODUCTION BUILD, NOT `next dev`. Dev serves unminified bundles,
 * compiles routes on first request and injects its own overlay — a11y and
 * performance numbers taken from it are fiction. `webServer` builds into a
 * separate dist directory so a running dev server is never clobbered; the
 * repo's own next.config.js warns about exactly that collision.
 */
const PORT = Number(process.env.E2E_PORT ?? 3399);

export default defineConfig({
  testDir: "./tests/e2e",
  // Serial by default: the suite shares one server and the rate limiter keeps
  // its counters in memory, so parallel form posts throttle each other.
  workers: process.env.CI ? 1 : 2,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],

  // Skipped when E2E_BASE_URL points somewhere already running.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        /* In CI the `Build` step has already produced `.next`, so rebuilding
           into `.next-e2e` would cost a second full compile for nothing —
           `CI` is set there, and only there, so the branch is explicit.
           Locally it still builds into its own directory, because a running
           `next dev` owns `.next` and this repo's next.config.js warns about
           exactly that collision. */
        command: process.env.CI
          ? `npx next start -p ${PORT}`
          : `NEXT_DIST_DIR=.next-e2e npx next build && NEXT_DIST_DIR=.next-e2e npx next start -p ${PORT}`,
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
