import { test, expect } from "@playwright/test";
import { FORM_ROUTES } from "./routes";

/**
 * Motion, and the three ways it is allowed to fail safe.
 *
 * This file exists because of a specific regression: a scroll reveal that
 * server-rendered `opacity: 0` shipped content invisible to anything that did
 * not run the animation. The rule since then is that motion may never be load
 * bearing — if it does not execute, the page still reads.
 */

test.describe("above the fold", () => {
  test("the hero is fully visible at t=0, before any scroll", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();

    const { opacity, transform } = await h1.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, transform: cs.transform };
    });
    expect(opacity, "the hero H1 must never animate in").toBe("1");
    expect(transform, "the hero H1 must never be transformed at rest").toBe("none");

    // The lead and the primary CTA are held to the same rule.
    for (const sel of ["main p", "main a[href]"]) {
      const el = page.locator(sel).first();
      if (await el.count()) {
        expect(await el.evaluate((n) => getComputedStyle(n).opacity)).toBe("1");
      }
    }
  });
});

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing is left hidden after a full scroll", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
        await new Promise((r) => setTimeout(r, 60));
      }
    });
    await page.waitForTimeout(600);

    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.height === 0) return false;
          // Closed menus are supposed to be invisible.
          if (el.closest("[hidden]") || el.closest("header")) return false;
          return parseFloat(getComputedStyle(el).opacity) < 0.99;
        })
        .map((el) => el.tagName + "." + String(el.className).split(" ")[0])
        .slice(0, 8)
    );

    expect(hidden, `reduced motion left content hidden: ${hidden.join(", ")}`).toHaveLength(0);
  });

  test("the scroll reveal is switched off entirely", async ({ page }) => {
    await page.goto("/");
    // The CSS layer is gated by @media (prefers-reduced-motion: no-preference),
    // so under `reduce` the animation must not even be assigned.
    const names = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal, .reveal-group > *")]
        .map((el) => getComputedStyle(el).animationName)
        .filter((n) => n && n !== "none")
    );
    expect(names, `reveal animations still bound: ${names.join(",")}`).toHaveLength(0);
  });
});

test.describe("without reduced motion", () => {
  test("content below the fold does arrive", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    });
    await page.waitForTimeout(800);

    const stuck = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal, .reveal-group > *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const onScreen = r.top < window.innerHeight && r.bottom > 0;
          return onScreen && parseFloat(getComputedStyle(el).opacity) < 0.99;
        }).length
    );
    expect(stuck, "a reveal above the fold never completed").toBe(0);
  });

  for (const route of FORM_ROUTES) {
    test(`no motion on the form at ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      const animated = await page.evaluate(() =>
        [...document.querySelectorAll("form input, form select, form textarea, form label")]
          .filter((el) => {
            const cs = getComputedStyle(el);
            return (cs.animationName && cs.animationName !== "none") || el.closest(".reveal, .reveal-group");
          })
          .map((el) => el.tagName)
          .slice(0, 5)
      );
      expect(animated, `fields must not animate while being filled in: ${animated.join(",")}`)
        .toHaveLength(0);
    });
  }
});
