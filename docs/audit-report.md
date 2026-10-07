# MediCraft audit — Part A

Read-only measurement of `feat/redesign-handoff` at `d7d4784`. No application
code was edited. The only writes were `depcheck` and `ts-prune` added as
devDependencies, and this file.

Measured against a **production build** (`next build` → `next start`), not the
dev server. Lighthouse is mobile form factor. axe is axe-core 4.14 over
WCAG 2.0/2.1 A + AA, plus a second pass including best-practice rules.

---

## Scorecard

### Lighthouse (mobile, production build)

| Route | Perf | a11y | Best prac. | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 92 | 100 | 100 | 3.3 s | 0 | 0 ms |
| `/products` | 90 | 100 | 100 | 3.6 s | 0 | 0 ms |
| `/product/[slug]` | 90 | 100 | 100 | 3.6 s | 0 | 0 ms |
| `/quality` | 90 | 100 | 100 | 3.6 s | 0 | 0 ms |
| `/about` | **89** | **98** | 100 | 3.8 s | 0 | 0 ms |
| `/providers` | 90 | **98** | 100 | 3.5 s | 0 | 0 ms |
| `/refill` | 92 | 100 | 100 | 3.3 s | 0 | 0 ms |
| `/contact` | **89** | 100 | 100 | 3.8 s | 0 | 0 ms |
| `/blog` | 94 | 100 | 100 | 3.0 s | 0 | 0 ms |
| `/login` | 96 | 100 | 100 | 2.9 s | 0 | 0 ms |
| `/portal` | 93 | 100 | 100 | 3.2 s | 0 | 0 ms |
| `/admin` | 94 | 100 | 100 | 3.0 s | 0 | 0 ms |

**CLS is 0 and TBT is 0 on all twelve.** Nothing here is a jank problem.
Everything that misses is load time: **LCP is 2.9–3.8 s on every route and the
target is 2.5 s — twelve of twelve fail it.**

**SEO score could not be measured.** Lighthouse 13.5's `canonical` audit throws
`URL.parse is not a function` on Node 21 (`URL.parse` landed in Node 22), and a
single errored audit nulls the whole category. Every *other* SEO audit passes
and the canonical tags are present and well-formed — see A2 — but I am not
reporting a number I did not measure.

### axe — 22 public routes × 2 widths, logged out

**Zero violations of any impact.** Including best-practice rules, the only hits
are `heading-order` on `/about` and `/providers` (1 node each), which is what
drags those two Lighthouse a11y scores to 98.

### axe — portal and admin, logged in, × 2 widths

| Route | 375 | 1440 |
|---|---|---|
| `/portal` | **1 serious**, 1 moderate | clean |
| `/portal/products` | **1 serious**, 1 moderate | clean |
| `/portal/*` (6 others) | 1–2 moderate | 0–1 moderate |
| `/admin/audit` | **1 serious**, 1 moderate | **1 serious** |
| `/admin/categories` | 3 moderate | 2 moderate |
| `/admin/inquiries` | 2 moderate | 1 moderate |
| `/admin/*` (6 others) | 1 moderate | clean |

Rule totals — portal: `region` 8, `scrollable-region-focusable` 2,
`heading-order` 2. Admin: `region` 9, `empty-table-header` 6,
`scrollable-region-focusable` 2.

**Every serious violation and nearly every moderate one appears only at 375.**
The desktop console is clean; the mobile one is not.

### SEO — 20 public routes

| Check | Result |
|---|---|
| HTTP 200 | 20/20 ✔ |
| Exactly one `<h1>` | 20/20 ✔ |
| Canonical present | 20/20 ✔ |
| Open Graph + Twitter | 20/20 ✔ |
| JSON-LD parses | 20/20 ✔, 0 malformed |
| Images with `alt` | 100% ✔ |
| Duplicate titles / descriptions | 0 / 0 ✔ |
| Accidental `noindex` | 0 ✔ |
| Title 50–60 chars | **1/20** ✘ |
| Description 140–160 chars | **12/20** ✘ |
| Heading order unbroken | **17/20** ✘ |
| `Product` JSON-LD on `/product/[slug]` | **absent** ✘ |

Sitemap: 60 URLs, every public route present, **zero private routes leaked**.
`robots.txt` disallows `/admin`, `/api/`, `/login` — **but not `/portal`**.
404s return a real 404 for unknown pages, products and posts (no soft 404s).
`llms.txt` serves 200, 10.4 kB.

### Baseline

`npm run lint` ✔ clean · `npx tsc --noEmit` ✔ 0 errors · `npm test` ✔ 174
assertions across 4 suites · `next build` ✔.

49 routes. Shared First Load JS 87.5 kB, median route 112 kB, heaviest
`/work-with-us` 160 kB. Middleware 27.1 kB. 6 static, 43 dynamic.

---

## Findings

### HIGH

**H1 — A 404 renders Next's unstyled default page.**
No `not-found.tsx` exists anywhere in `app/`. Verified: `GET /nope` returns
11,601 bytes with `has site nav: False`, `has footer: False`, title
`404: This page could not be found.` Every mistyped URL, every delisted
product and every stale inbound link lands a prospective prescriber on a bare
white page with no navigation back and no indication they are still on a
licensed pharmacy's site.
*Fix:* `app/not-found.tsx` inside the `(site)` shell, plus `app/global-error.tsx`.

**H2 — LCP fails the 2.5 s target on all twelve routes (2.9–3.8 s).**
CLS is 0 and TBT is 0, so this is not jank or main-thread work — it is purely
how long the largest element takes to paint. `/about` 3.8 s and `/contact`
3.8 s are the worst and are the two routes scoring 89.
*Fix:* needs the bundle-analyzer pass to attribute. Prime suspects: 5 public
images over 200 kB (`cover-licenses.jpg` is 400 kB), 12 non-WebP rasters, and
`force-dynamic` on the `(site)` layout forcing a server render per request.

**H3 — `robots.txt` does not disallow `/portal`.**
`/admin`, `/api/` and `/login` are disallowed; the ten `/portal/*` routes are
not. They redirect unauthenticated users so no content leaks, but crawlers are
invited to walk them and will record ten redirect chains.
*Fix:* one `Disallow: /portal` line in `app/robots.ts`.

**H4 — `careers/actions.ts` is an unauthenticated, unthrottled upload endpoint.**
It is the only public form action with no `rateLimit` call — `contact`,
`refill`, `work-with-us` and `login` all have one — and it accepts a CV file.
*Fix:* add the same `rateLimit` guard the sibling actions use.

**H5 — `scrollable-region-focusable` (serious) ×4.**
`/portal` and `/portal/products` at 375, `/admin/audit` at both widths. The
node is `<div class="overflow-x-auto">` wrapping a table: a region a mouse can
scroll and a keyboard cannot reach.
*Fix:* `tabIndex={0}` plus an accessible name on the scroll container.

### MEDIUM

**M1 — 19 of 20 titles are outside 50–60 characters.**
Most are far too short — `/careers` 28, `/contact` 28, `/products` 29 — and two
are too long: `/` at 90 and `/product/[slug]` at 84. Blog posts are the one
page type that gets this right (59 chars), which suggests the helper is fine
and the call sites are thin.

**M2 — 8 of 20 descriptions are outside 140–160 characters.**
`/products` is **18 characters**. `/product/[slug]` is 295. `/careers` 109,
`/contact` 118, `/compounding` 188, `/refill` 177, `/about` 182, `/terms` 137.

**M3 — No `Product` JSON-LD on `/product/[slug]`.**
The page emits `Pharmacy` and `WebSite` only. For a formulary this is the one
structured-data type that earns rich results, and it is the page type with 30
instances. `BreadcrumbList` is also missing there (present on every other
interior page).

**M4 — `heading-order` skips on `/about`, `/providers`, `/products/weight-management`.**
Confirmed independently by parsing the SSR HTML and by axe's best-practice
pass. This is the cause of the two Lighthouse a11y 98s.

**M5 — `region` violations ×17 at 375 only.**
`<div class="border-b border-hair-soft px-4 py-2 lg:hidden">` — the mobile tab
strip in both the portal and admin layouts sits outside any landmark.
*Fix:* make it a `<nav aria-label="Sections">`.

**M6 — `empty-table-header` ×6** on `/admin/categories` and `/admin/inquiries`.

**M7 — 15 of 22 server actions coerce input instead of validating it.**
They use `String(data.get("x") ?? "").trim()`. That prevents type confusion but
applies no length, format or enum bound, so an arbitrarily long string reaches
Postgres and, in several paths, an outbound email. The largest are
`app/portal/actions.ts` (474 lines), `app/portal/products/actions.ts` (369) and
`app/admin/partners/pricing-actions.ts` (254).
**Not a vulnerability as written** — every one of them is behind a session
check except the four public forms, and those four do validate. Treat as
hardening, and per the brief I will explain each before touching it.

**M8 — Error and loading boundaries are missing almost everywhere.**
`error.tsx` exists only on `/admin`. `loading.tsx` exists on 5 admin routes and
**no portal route**, despite every portal page being `force-dynamic` and
database-backed. No `global-error.tsx`.

**M9 — 34 raw hex values in `.tsx`.**
Notably `#bcd9c6` in `app/admin/products/page.tsx:56` and
`app/admin/blog/page.tsx:41`, and `#e8cf9a` / `#fdf8ee` / `#8a6416` in
`app/admin/partners/[id]/page.tsx:262` — a hand-rolled amber pair that the
`warning` token already covers. (Palette classes are at 0 ✔.)

**M10 — SEO score cannot be certified on this toolchain.** See the scorecard
note. Either pin Node 22 for the perf job or assert the SEO checks directly in
`tests/e2e/seo.spec.ts`, which is more durable anyway.

### LOW

**L1 — 2 genuinely unused npm dependencies:** `embla-carousel-react`,
`@auth/prisma-adapter`. (`pg`, `us-atlas`, `d3-geo`, `autoprefixer`, `postcss`
were all flagged by depcheck and are all **false positives** — verified in
`middleware.ts`, `scripts/generate-us-map.mjs`, `CoverageMap.tsx` and
`postcss.config.js`.)

**L2 — 4 unimported component files, 394 lines:** `components/icons/index.tsx`
(171), `components/media/CustodyFilm.tsx` (130), `components/sections/Hero.tsx`
(91), `components/motion/Stagger.tsx` (2).

**L3 — 19 unreferenced non-product images, ~1.3 MB.** Five payment-card icons,
nine brand/stationery renders, `mc-home-hero-vials-16x9-2x.webp` (80 kB).
The 30 files under `public/images/products/` are **not** dead — they are
resolved by slug from the database.

**L4 — 185 unused exports** (`ts-prune`). Concentrated in `lib/data.ts`,
`lib/crypto.ts`, `lib/api.ts` and `lib/content.ts`. Per the brief, anything
under `lib/services`, `lib/partner`, `prisma` or tests is listed rather than
deleted.

**L5 — 7 `console.log`, 2 `TODO`, 8 inline `eslint-disable`.** Zero
`@ts-ignore`, zero `: any`.

**L6 — 35 files over 300 lines.** Largest outside content modules:
`lib/services/email.ts` 1385, `lib/partner/status.ts` 958,
`lib/services/msa-pdf.ts` 943, `components/blocks.tsx` 618,
`components/Navbar.tsx` 618.

**L7 — Satoshi-900 is loaded for 6 usages** of `font-black` site-wide. The
redesign moved display type to weight 400. Dropping the 900 face removes a
woff2 from the critical path.

**L8 — 5 public images over 200 kB; 12 non-WebP rasters.**
`cover-licenses.jpg` 400 kB, `cover-support.jpg` 258 kB,
`cover-providers.jpg` 231 kB, `stationery-cards.webp` 232 kB,
`careers-team.jpg` 202 kB. Feeds H2.

**L9 — 4–6 interactive targets under 44 px on mobile** per route, including the
hamburger at 40×40. They clear WCAG 2.2's 24×24 minimum, so this is
best-practice, not a failure.

**L10 — Only 2 client components could be demoted** (`components/ui/sheet.tsx`,
`components/ui/Reveal.tsx`) out of 57. The client/server split is in good shape.

### What is already right

Worth stating, because it bounds the work: CLS 0 and TBT 0 everywhere; zero axe
violations on all 22 public routes at both breakpoints; zero horizontal overflow
at 200 % zoom on every route tested; all six security headers present including
a real CSP with `frame-ancestors 'none'`; no secrets in the client bundle; every
public page has a `metadata` export; sitemap leaks nothing private; uploads
validate MIME type and cap at 25 MB; `getProductsByCategory` is **not** an N+1 —
it delegates to a `cache`d `getProducts()`, so the eleven-category nav loop is
two queries, exactly as its comment claims.

### Tests — the biggest gap

Four suites, 174 assertions, all passing: `masks` (96), `parity` (50), `msa`
(28), plus `e2e.mjs` and `pipeline.mjs` harnesses.

**Zero coverage of `lib/services` (26 modules), zero of any server action, and
zero of every critical flow:** login, refill submit, contact submit, portal
application → agreement, admin partner status change. There is no a11y test, no
SEO test, no performance budget and no CI workflow. Every number in this report
was produced by hand and nothing stops any of them regressing tomorrow.

---

## Prioritised fix list

| # | Finding | Severity | Effort |
|---|---|---|---|
| 1 | Test harness + CI (nothing is currently defended) | — | L |
| 2 | H1 `not-found.tsx` + `global-error.tsx` | High | S |
| 3 | H3 `Disallow: /portal` | High | XS |
| 4 | H4 rate-limit `careers` | High | XS |
| 5 | H5 `scrollable-region-focusable` ×4 | High | S |
| 6 | H2 LCP < 2.5 s (images, formats, caching) | High | M |
| 7 | M1–M3 titles, descriptions, `Product` + `BreadcrumbList` JSON-LD | Medium | M |
| 8 | M4–M6 heading order, `region`, empty table headers | Medium | S |
| 9 | M8 error + loading boundaries | Medium | S |
| 10 | M9 34 raw hex → tokens | Medium | S |
| 11 | M7 Zod on 15 server actions (explain each first) | Medium | M |
| 12 | L1–L5 dead code, deps, images, logs | Low | S |
| 13 | L6–L9 file splits, font weight, image budget, touch targets | Low | M |

Recommended order: **1 → 2,3,4 → 5 → 6 → 7,8 → 9,10 → 11 → 12,13.** Tests first
so every subsequent step has a before/after number rather than an assertion.

Awaiting "go" before Part B.
