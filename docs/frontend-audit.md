# Frontend audit — MediCraft Pharmacy

Pass 1 of the frontend overhaul. No files were changed to produce this.
Measured against the running app on 2026-10-01, Next.js 14.2.35.

---

## What is already right

Worth stating first, because the overhaul should not churn these:

- **SEO and LLM readability are largely done.** `app/sitemap.ts`, `app/robots.ts`
  and `app/llms.txt/route.ts` all exist. `robots.ts` already allows `GPTBot`,
  `ClaudeBot`, `PerplexityBot`, `Google-Extended` and `Applebot-Extended`.
  Every page under `app/(site)` exports `metadata`, and `lib/seo.ts` has a
  JSON-LD helper used for Breadcrumb/Organization.
- **Content is server-rendered.** `curl` on `/` and `/products` returns the
  headline and the category names in the first response — no client-only text.
- **Security headers are set** — in `middleware.ts`, not `next.config`, which is
  why a config grep looks empty. CSP, HSTS, `X-Frame-Options: DENY`, nosniff,
  Referrer-Policy and Permissions-Policy are all on the live response.
- **Authorisation is server-side** via `requireRole` / `requirePermission`, with
  page guards redirecting and API guards throwing.
- **Tests exist and run**: 137 unit, 177 e2e, 67 pipeline.

---

## Fix now

### 1. Six production vulnerabilities, one critical
`npm audit --omit=dev` reports **5 high, 1 critical**:

| Package | Severity | Note |
|---|---|---|
| `next` 14.2.35 | **critical** | in range 9.3.4-canary.0 – 16.3.0-preview.10 |
| `mysql2` | high | transitive; this app uses Postgres, so check why it is in the prod tree |
| `deepmerge-ts` | high | |
| `postcss` (under next) | high | |

The Next.js advisory is the one that matters. Upgrading Next is a real change
with its own regression risk, so it wants its own branch and a full suite run —
not a `--force` in the middle of a design pass.

### 2. shadcn is not actually installed
There is **no `components.json`**, so `npx shadcn@latest add <component>` cannot
run. `components/ui/` holds only `badge`, `button`, `input`, `label`, `sheet` —
hand-written, not generated. The skill's stack assumes shadcn primitives; today
Dialog, Select, Tabs, Toast, Skeleton and DataTable do not exist at all.

---

## This pass

### Structure
- **`components/ui/` is not primitives-only.** It contains `ProductCarousel.tsx`
  and `Reveal.tsx` — a feature component and a motion component living in the
  folder the skill reserves for unmodified primitives.
- **No generic `DataTable`.** Four files import `@tanstack/react-table` directly
  (`PartnersTable`, `PostsTable`, `ProductsTable`, and one more), each
  re-implementing its own table shell, toolbar and pagination.
- **78 files exceed 150 lines**, the skill's split threshold.
- **45 of 131 `.tsx` files are client components** (34%). Some are certainly
  correct (the nav, the bell); the set has never been audited for `"use client"`
  that could be pushed down to a leaf.
- **Route groups do not match the skill's shape** — this app uses `app/(site)`,
  `app/admin`, `app/portal` rather than `(marketing)` / `(app)`. This is a
  *naming* difference over a working structure; renaming is churn with no user
  benefit, so I would keep the existing groups and adapt the skill.
- **Forms**: react-hook-form is used in 5 components, but there is no shadcn
  `Form`/`FormField` wrapper. Earlier today the two competing field kits were
  merged into `components/ui/form/` (`fields.tsx` RHF, `native.tsx` server
  action, `submit.tsx` shared), so the duplication is already gone.

### Design tokens
The palette is not enforced:

| Measure | Count |
|---|---|
| Distinct hex colours outside `globals.css` | **41** |
| Hardcoded palette classes (`text-cyan-700`, `bg-emerald-50`, …) | **~90** |
| Arbitrary spacing values (`p-[13px]` style) | **30** |
| Arbitrary text sizes (`text-[1.0625rem]` style) | **22** |

Most of the hardcoded colours are status colours — emerald for success, red for
error, amber for warning — repeated inline in a dozen components instead of
being `--success` / `--destructive` / `--warning` tokens.

### Docs
`docs/design-system.md` does not exist, and `CLAUDE.md` has no "read the design
system before adding a component" rule. Nothing stops the next component from
reintroducing the 41 hexes.

---

## Later

- Lighthouse has not been run; no measured LCP/CLS/INP baseline exists.
- No `@next/bundle-analyzer`, so client bundle composition is unknown. The
  production build reports first-load JS of 87.3 kB shared, with the heaviest
  route at 156 kB — healthy on the face of it.
- Image sources supplied so far are 400–1200 px and are being used in full-bleed
  mastheads, so several covers are upscaled. This is an asset problem, not a
  code one.

---

## Test state

All suites pass on a freshly started dev server:

| Suite | Result |
|---|---|
| unit (masks, parity, MSA) | 137 passed |
| e2e | 177 passed |
| pipeline | 67 passed |
| endpoint sweep (added here) | 146 passed |

**The two notification failures and the pipeline upload failure were both stale
process state, not code.** `lib/rate-limit.ts` keeps its counters in memory, so
running the suites back to back inside one 15-minute window exhausts
`RATE_LIMITS.upload` (40 per partner) and the document step starts failing,
which cascades into every assertion after it. Restarting the dev server clears
it. Worth knowing before anyone spends an afternoon on it as I did.

A related trap: `waitUntil: "networkidle"` never fires on an authenticated
page, because `LivePulse` polls `/api/pulse` every five seconds. Any browser
automation against `/portal` or `/admin` has to wait on an element instead.
