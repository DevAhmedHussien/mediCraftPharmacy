import { test, expect, request as pwRequest } from "@playwright/test";
import { PUBLIC_ROUTES, SAMPLE } from "./routes";

/**
 * SEO, asserted against the SERVER'S HTML.
 *
 * Every fetch here uses the request context rather than the browser, on
 * purpose: the question is what a crawler receives before any JavaScript
 * runs. Checking the rendered DOM would pass even if the heading only existed
 * after hydration, which is the failure this is meant to catch.
 *
 * These assertions are the audit's A2 section turned into a gate. The numbers
 * it recorded by hand — 19 of 20 titles out of range, 8 descriptions, three
 * heading skips, no Product schema — are what the ranges below enforce.
 */

test.describe.configure({ mode: "parallel" });

// Once, not once per viewport. Nothing here renders anything — it reads the
// bytes the server sent — so running it again at a second width would assert
// the same string twice and double the suite for nothing.
test.beforeEach(({}, testInfo) => {
  testInfo.skip(testInfo.project.name !== "desktop", "SSR-only: viewport is irrelevant");
});

const titles = new Map<string, string>();
const descriptions = new Map<string, string>();

for (const route of PUBLIC_ROUTES) {
  test(`SEO: ${route}`, async ({ baseURL }) => {
    const ctx = await pwRequest.newContext({ baseURL });
    const res = await ctx.get(route);
    expect(res.status(), `${route} must return 200`).toBe(200);
    const html = await res.text();
    await ctx.dispose();

    // --- One h1, and it is in the server HTML -----------------------------
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    expect(h1s.length, `${route} must have exactly one <h1>`).toBe(1);

    // --- Title -------------------------------------------------------------
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1]?.trim() ?? "";
    expect(title.length, `${route} title is empty`).toBeGreaterThan(0);
    expect(title.length, `${route} title is ${title.length} chars: "${title}"`)
      .toBeGreaterThanOrEqual(30);
    expect(title.length, `${route} title is ${title.length} chars: "${title}"`)
      .toBeLessThanOrEqual(65);
    expect(titles.has(title), `${route} duplicates the title of ${titles.get(title)}`).toBe(false);
    titles.set(title, route);

    // --- Description -------------------------------------------------------
    const desc = html.match(/<meta name="description" content="(.*?)"/s)?.[1] ?? "";
    expect(desc.length, `${route} description is ${desc.length} chars`).toBeGreaterThanOrEqual(110);
    expect(desc.length, `${route} description is ${desc.length} chars`).toBeLessThanOrEqual(170);
    expect(descriptions.has(desc), `${route} duplicates the description of ${descriptions.get(desc)}`)
      .toBe(false);
    descriptions.set(desc, route);

    // --- Canonical, social, indexability -----------------------------------
    expect(html, `${route} has no canonical`).toContain('rel="canonical"');
    expect(html.match(/property="og:/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(html.match(/name="twitter:/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html, `${route} is accidentally noindex`).not.toContain("noindex");

    // --- Structured data parses --------------------------------------------
    const blocks = [...html.matchAll(/type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
    expect(blocks.length, `${route} has no JSON-LD`).toBeGreaterThan(0);
    for (const [, body] of blocks) {
      expect(() => JSON.parse(body), `${route} has malformed JSON-LD`).not.toThrow();
    }

    // --- Heading order has no gaps -----------------------------------------
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    const skips = levels.filter((lvl, i) => i > 0 && lvl - levels[i - 1] > 1);
    expect(skips, `${route} skips heading levels: ${levels.join(",")}`).toHaveLength(0);

    // --- Images are described ----------------------------------------------
    const imgs = html.match(/<img\b[^>]*>/g) ?? [];
    const noAlt = imgs.filter((i) => !/\balt=/.test(i));
    expect(noAlt, `${route} has ${noAlt.length} <img> without alt`).toHaveLength(0);
  });
}

test("product pages carry Product and BreadcrumbList schema", async ({ baseURL }) => {
  const ctx = await pwRequest.newContext({ baseURL });
  const html = await (await ctx.get(SAMPLE.product)).text();
  await ctx.dispose();

  const types = [...html.matchAll(/type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
    .flatMap(([, b]) => {
      const parsed = JSON.parse(b);
      return (Array.isArray(parsed) ? parsed : [parsed]).map((o) => o["@type"]);
    });

  // The one schema type a formulary earns rich results from, on the page type
  // with thirty instances.
  expect(types, `product page emits ${types.join(",")}`).toContain("Product");
  expect(types).toContain("BreadcrumbList");
});

test("blog posts carry Article schema", async ({ baseURL }) => {
  const ctx = await pwRequest.newContext({ baseURL });
  const html = await (await ctx.get(SAMPLE.post)).text();
  await ctx.dispose();
  expect(html).toMatch(/"@type":\s*"(BlogPosting|Article)"/);
});

test("robots and sitemap: everything public, nothing private", async ({ baseURL }) => {
  const ctx = await pwRequest.newContext({ baseURL });
  const robots = await (await ctx.get("/robots.txt")).text();
  const sitemap = await (await ctx.get("/sitemap.xml")).text();
  await ctx.dispose();

  for (const path of ["/admin", "/api/", "/login", "/portal"]) {
    expect(robots, `robots.txt must disallow ${path}`).toContain(`Disallow: ${path}`);
  }

  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => u);
  expect(locs.length).toBeGreaterThan(10);
  for (const priv of ["/admin", "/portal", "/login"]) {
    expect(locs.filter((u) => u.includes(priv)), `sitemap leaks ${priv}`).toHaveLength(0);
  }
  for (const route of ["/products", "/quality", "/contact"]) {
    expect(locs.some((u) => u.endsWith(route)), `sitemap is missing ${route}`).toBe(true);
  }
});

test("a missing page is a real 404, branded, and not indexed", async ({ baseURL }) => {
  const ctx = await pwRequest.newContext({ baseURL });
  const res = await ctx.get("/definitely-not-a-real-page");
  expect(res.status()).toBe(404);
  const html = await res.text();
  await ctx.dispose();

  // Next's built-in 404 is ~11 kB with no chrome. Ours carries the footer.
  expect(html, "404 lost its footer — is app/not-found.tsx still there?")
    .toMatch(/LegitScript|PCAB/);
  expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  expect(html).toContain("noindex");
});
