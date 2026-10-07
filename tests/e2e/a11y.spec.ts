import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ALL_ANON_ROUTES } from "./routes";

/**
 * Accessibility, at both breakpoints.
 *
 * BOTH is the point. The audit found zero violations on every public route at
 * 1440 and four SERIOUS ones in the portal and admin at 375 — a scrollable
 * table a mouse can reach and a keyboard cannot. A desktop-only gate would
 * have reported all clear. The `mobile` project in playwright.config.ts is
 * not redundancy; it is where the bugs were.
 *
 * Serious and critical fail the build. Moderate and minor are reported but
 * tolerated, because `region` fires on any wrapper outside a landmark and
 * chasing it to zero rewards markup gymnastics over actual access.
 */

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const route of ALL_ANON_ROUTES) {
  test(`a11y: ${route}`, async ({ page }, testInfo) => {
    await page.goto(route, { waitUntil: "networkidle" });

    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");

    const describe = (vs: typeof violations) =>
      vs
        .map((v) => `[${v.impact}] ${v.id} ×${v.nodes.length}\n      ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("\n      ")}`)
        .join("\n    ");

    if (violations.length) {
      testInfo.annotations.push({ type: "axe", description: describe(violations) });
    }

    expect(blocking, `${route} @${testInfo.project.name}:\n    ${describe(blocking)}`).toHaveLength(0);
  });
}

test.describe("keyboard", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(testInfo.project.name !== "desktop", "keyboard nav is a desktop concern");
  });

  test("the nav dropdown opens, is enterable, and gives focus back", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /the pharmacy/i });
    await trigger.focus();
    await expect(trigger).toBeFocused();

    // Focus alone must NOT open it. It used to, which meant Enter then
    // toggled the panel shut and a keyboard user closed something they never
    // knowingly opened.
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Tab must land INSIDE the panel, not skip past it.
    await page.keyboard.press("Tab");
    const panel = page.locator(`#${await trigger.getAttribute("aria-controls")}`);
    await expect(panel.locator(":focus")).toHaveCount(1);

    // Escape closes AND returns focus — losing it sends a keyboard user back
    // to the top of the document to find their place again.
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  });

  test("the dropdown is reachable by mouse", async ({ page }) => {
    // The panel sits below the trigger with a gap. If that gap belongs to
    // neither element the menu shuts before the pointer arrives and every
    // link in it is unclickable — which is exactly what shipped once.
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /the pharmacy/i });
    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const panel = page.locator(`#${await trigger.getAttribute("aria-controls")}`);
    const link = panel.getByRole("link").first();
    await link.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(link).toBeVisible();
  });

  test("the skip link is the first stop and it works", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator(":focus");
    await expect(skip).toHaveText(/skip to content/i);
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("every refill field is reachable and labelled", async ({ page }) => {
    await page.goto("/refill");
    const fields = page.locator("form input:not([type=hidden]), form select, form textarea");
    const n = await fields.count();
    expect(n).toBeGreaterThan(5);

    for (let i = 0; i < n; i++) {
      const f = fields.nth(i);
      // An accessible name from a <label>, aria-label or aria-labelledby.
      const name = await f.evaluate((el) => {
        const id = el.getAttribute("id");
        const lbl = id ? document.querySelector(`label[for="${id}"]`) : null;
        return (
          el.getAttribute("aria-label") ||
          (el.getAttribute("aria-labelledby") &&
            document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent) ||
          lbl?.textContent ||
          ""
        ).trim();
      });
      expect(name, `refill field ${i} has no accessible name`).not.toBe("");
    }
  });
});
