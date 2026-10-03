# Medicraft Pharmacy

A high-performance, SEO-optimized marketing site for **Medicraft Pharmacy**, a
specialty compounding pharmacy. Built with Next.js 14 (App Router), TypeScript,
Tailwind CSS, and Framer Motion.

## Stack
- **Next.js 14** — App Router, server components, built-in metadata/SEO
- **TypeScript** — strict mode
- **Tailwind CSS** — custom brand theme
- **Framer Motion** — scroll-reveal + entrance animations
- **lucide-react** — icons

## Getting started
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Structure
```
app/            layout, page, sitemap.ts, robots.ts, global CSS
components/      Navbar, Footer + sections/ (Hero, Products, Quality, ...)
lib/            site.ts (brand config), data.ts (content)
```

## SEO built in
- Per-page metadata + Open Graph / Twitter cards (`app/layout.tsx`)
- JSON-LD `Pharmacy` structured data
- `sitemap.xml` and `robots.txt` generated at build
- Semantic HTML, `prefers-reduced-motion` support, responsive layout

## Replacing placeholder assets
All copy is original to Medicraft. Imagery currently loads royalty-free
Unsplash photos as **placeholders**. Before launch, replace them with
Medicraft's own licensed photography/video:

1. Drop real files into `public/` (e.g. `public/hero.jpg`, `public/lab.mp4`).
2. Swap the `src` values in `components/sections/Hero.tsx`, `Products.tsx`,
   `Quality.tsx`, and the image URLs in `lib/data.ts`.
3. Update brand details (phone, address, hours, social) in `lib/site.ts`.

> Note: This site is an original build. It does not reuse another pharmacy's
> proprietary images, video, or copy — that keeps you clear of copyright issues
> and avoids duplicate-content SEO penalties.

---

# Backend & Admin

The marketing site now sits alongside a Postgres-backed admin. This section
covers running it locally.

## Requirements

- **Node 22 LTS.** Pinned in `.nvmrc` — Prisma 7 refuses Node 21 and below.
  `nvm use` picks it up.
- **PostgreSQL 14+** running locally.

## Running locally

```bash
nvm use                       # Node 22, per .nvmrc
npm install

createdb medicraft            # or: psql -c "CREATE DATABASE medicraft;"
cp .env.example .env          # then fill in the three secrets below

npx prisma migrate dev        # creates the schema
npx prisma db seed            # admins, catalog, blog, 60 days of analytics
npm run dev
```

Generate the three required secrets:

```bash
openssl rand -base64 32       # AUTH_SECRET
openssl rand -base64 32       # FIELD_ENCRYPTION_KEY  (must be 32 bytes)
openssl rand -base64 24       # ANALYTICS_SALT
```

### Seeded accounts

| Email | Role | Password |
|---|---|---|
| `super@medicraftpharmacy.com` | Super admin | `MediCraft!2026` |
| `admin@medicraftpharmacy.com` | Admin | `MediCraft!2026` |

The second account deliberately holds only a **subset** of permissions (no
`msa.send`, no `onboarding.review`), so the permission guards are visible the
first time you click around rather than only in production.

Sign in at `/login`; the admin is at `/admin`.

> ⚠ **Catalog prices are placeholders.** `lib/data.ts` carries no prices — the
> marketing catalog never showed any — so the seed derives figures from the
> dosage form purely so the admin has something to sort and total. Replace
> them with the real price book before anyone outside the team sees them.

## What exists so far

| Area | State |
|---|---|
| Schema, migrations, seed | Done — 32 tables |
| Auth (Auth.js v5, credentials) + permission guards | Done |
| Admin analytics dashboard | Done |
| Products CRUD | Done |
| Blog CRUD (drafts, scheduling, revisions, categories) | Done |
| Storage service (S3 + local drivers) | Written, S3 untested without keys |
| Public blog (index, post, sanitised Markdown) | Done |
| Account-setup questionnaire (RHF + masks) | Done — writes a partner in APPLICATION_SUBMITTED |
| SEO: hero OG card, JSON-LD graph, llms.txt, AI-crawler robots | Done |
| Partner pipeline beyond step 1, emails, notifications, DocuSign, Stripe | Not started |

## Tests

```bash
npm test          # mask unit tests — 35 assertions, no server needed
npm run test:e2e  # 65 assertions against a real server, browser and database
```

The e2e suite needs the app running (`npx next start -p 3311`) and a seeded
database. It signs in as the super admin, drives Chrome, and checks every UI
claim against the row it should have written — a redirect that writes nothing
is the exact class of bug it exists to catch. It also asserts the negative
cases: a PARTNER is refused at /admin, a draft post 404s publicly, an invalid
price leaves the row untouched, and a `<script>` in a post body is stripped
before it renders.

## Frontend conventions

**Two form systems, on purpose.**

- `components/forms/*` — the public marketing forms. Native posts to server
  actions, no client validation library, works with JavaScript disabled.
- `components/form/*` — React Hook Form + Zod, for the long authenticated
  forms. Someone entering two prescribers and a DEA number must not discover a
  typo after a round trip.

Both validate with the same Zod schema on the server. The client copy is UX;
the server is the gate.

**Masks** live in `lib/masks.ts` and are plain functions — US phone
(display `(727) 555-0142`, stored `+17275550142`), date (display `mm-dd-yyyy`,
stored ISO), plus DEA checksum and NPI Luhn validation. Every parser is
**idempotent**: it accepts its own output, because RHF hands `handleSubmit`
the already-transformed values and the server then parses them again.

**Tables** use TanStack Table v8 (`components/admin/DataTable.tsx`). v9 is a
modular rewrite whose API is still moving — it ships a `legacy` entry point
precisely because it broke everything — so v8 is what this uses.

## SEO

- `/opengraph-image` renders the hero vial render with the headline, 1200×630.
  Satori cannot decode WebP, so `public/images/site/mc-home-hero-vials-og.jpg`
  exists solely for this.
- JSON-LD graph: `Pharmacy` + `WebSite` (with `knowsAbout`) site-wide,
  `BreadcrumbList` per page, `Product` on product pages, `FAQPage` on support,
  `BlogPosting` on articles.
- `/llms.txt` — a curated plain-Markdown map of the site for language models,
  generated from the same catalog the pages render from. It states explicitly
  that PCAB accreditation is *in progress* and that licensure is Florida-only,
  because those are the two facts a model is most likely to get wrong.
- `robots.txt` names AI crawlers individually and allows them; `/admin`,
  `/api/` and `/login` are disallowed for everyone.
- Sitemap is database-driven, so publishing a post adds it automatically.

## Architecture notes

**Route groups.** `app/(site)/*` carries the public shell (navbar, footer,
Pharmacy JSON-LD); `/admin` and `/login` sit outside it with their own chrome.
URLs are unchanged — a route group affects the file tree, not the path.

**Authorisation is two-tier.** `requireRole` reads the JWT and is cheap enough
for render decisions. `requirePermission` re-queries the database and is what
every mutation uses, because a permission revoked five minutes ago is still
sitting in the holder's token. Hiding a button is never the control.

**The state machine is the single source of truth.** Nothing outside
`lib/partner/status.ts` may write `partner.status`. `effects` is a required
field of every transition, so adding an edge without deciding who gets emailed
and notified is a compile error.

**Money is `Decimal`, never `Float`.** Negotiated prices are contractual.

**Analytics are first-party and cookieless.** `visitorHash` is
HMAC(ip + user-agent, salt-of-the-day): enough to count unique visitors per
day, not enough to follow anyone across days. No IP is stored, no cookie is
set, no consent banner is needed. Rotating `ANALYTICS_SALT` daily is the whole
privacy property.

## Switching storage to S3

1. Create a **private** bucket — no public ACL, block all public access on.
2. Set `STORAGE_DRIVER="s3"` and the four `S3_*` variables. `lib/env.ts`
   refuses to boot if the driver is `s3` and any of them are missing.
3. CORS on the bucket must allow `PUT` from your origin, because uploads are
   presigned and go browser → S3 directly rather than through the server.

Existing `Media` rows record the driver that wrote them, so files uploaded
locally keep resolving after the switch instead of 404ing.

## Not yet wired

- **DocuSign** — no credentials yet. Needs integration key, RSA private key,
  account id, template id and the Connect HMAC.
- **Stripe** — SetupIntent flow not built.
- **Email delivery** — `EMAIL_DRIVER="console"` until a provider key exists.

## The Master Service Agreement and the Partner Formulary

The signed document is MSA v2026.1. It is reproduced in three places, each for
a different reason:

- **`lib/signature-text.ts`** — the agreement body (§1–16) as the text a partner
  reads and signs in the portal. Nothing is added to it; explanation belongs on
  the page around it, not in the contract.
- **`lib/msa-terms.ts`** — the thirty-six commercial terms the PDF leaves as
  INSERT fields. Every one starts as `null` and prints as a visible blank. The
  admin partner screen shows how many are still unfilled before anyone sends an
  agreement. **These need filling in before a real partner signs.**
- **`prisma/data/formulary-2026.json`** — Schedule A-1, all 692 items with their
  Provider Cost, extracted by `scripts/extract-formulary.py`.

Re-extract the formulary from a new edition with:

```
brew install poppler   # once
python3 scripts/extract-formulary.py <msa.pdf> prisma/data/formulary-2026.json
```

It verifies itself against the formulary's own per-category counts and exits
non-zero rather than emitting a plausible-looking partial parse.
