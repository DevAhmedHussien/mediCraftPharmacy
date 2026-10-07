# Redesign report

Branch `feat/redesign-handoff`, 14 commits, 109 files, +2,227 / −991.

The job was to make the application look like `design_handoff/` and change
nothing else. Every route, every server action, every guard and every word of
copy is as it was: `lib/content.ts`, `lib/site.ts`, `lib/data.ts`,
`lib/partner/steps.ts` and `lib/msa-terms.ts` are **byte-identical to main**.

**Not pushed, not deployed.**

---

## The four things that were actually wrong

Most of the work was not "apply the new colours". It was four systemic faults,
each of which made dozens of screens wrong at once.

### 1. The pages were two different widths

`.container-x` was `max-w-[1280px]` with gutters stepping `px-5 sm:px-8
lg:px-10`. The nav pill, the home page and `PageHeader` are all 1120 with a
flat 20px gutter. So on every interior page the floating header's left edge
and the first paragraph's left edge were 30px apart, and the sections below
ran 160px wider than the header above them.

One class. 41 call sites, 19 files. Verified by measuring rendered boxes: at
1440 the header and the section content now both start at x=180.

This is what "all marketing pages take same wide pages" meant.

### 2. The neutrals were still the old palette

The heroes and the container were rebuilt before this was caught. `sand` was
`#f5f8fd` and `line` `#dde4f0` — blue-tinted greys. The reference uses
`#f7f7f5` for ground and `#ecece7` / `#e3e3de` / `#dadad4` for hairlines, and
neither old value appears anywhere in it. Every interior page had a cool
divider against a warm one on the same card, which is most of why they still
read as the old site after the structural work.

Both tokens repointed. `lib/og.tsx` and `lib/services/email.ts` carry
hand-copied duplicates — neither can read a stylesheet — and moved with them,
because an inbox is the one surface a partner sees before signing in.

### 3. The two consoles were different furniture

The portal and admin rails used the same component shape, the same
`.admin-rail-link` class and the same grouping, and rendered as two completely
different objects: one a floating glass card, one a bordered 224px column.
Both are now `260px | 1fr` with a sticky glass rail in a 16px gutter, mono
group headings, a white chip for the current item, and the identity control in
the page header on desktop.

### 4. The status colours bypassed the tokens

`components/admin/ui.tsx` held ten hardcoded hexes for the five tones. That is
how `good` ended up `#246848` on `#e3f0e8` — a green, the only green in the
application, sitting four pixels from a brand-blue pill in the next row of the
partners table. Same story in `PipelineFunnel`, where "Verified" was a
hardcoded `#2f855a`.

All five tones now resolve from the `success` / `warning` / `danger` / `info`
pairs, each verified at 4.5:1 twice over — on its own chip and on the page
ground, since these pills appear in both places.

---

## Smaller things that were wrong

- **The Related carousel sliced its last card down the middle.** The track
  bleeds past the container with `-mx` and pays it back with matching `px`,
  and all three values were sized for the gutters `.container-x` had *before*
  the redesign.
- **The product page had two left edges.** Description and Prescriber
  directions sat on `container-narrow`, which centres itself, so they started
  126px right of the breadcrumb, the spec table and the CTA.
- **Packshots were being cropped.** The formulary card used `object-cover` on
  a 1257×1600 portrait render squeezed into a square — cap and base cut off on
  every tile. `contain` on a stone plate now.
- **Strength and form were pinned to the foot of each card** with `mt-auto`,
  so with blurbs of different lengths they landed at a different height in
  every tile and could not be compared down a column — which is the entire
  reason they are set in mono.
- **`.card-title` was brand blue**, so every card heading on the site was the
  same colour as every link on the site.
- **Three contact channel cards wore a 3px brand bar** — decoration encoding
  nothing, on the only cards on the site that had one.
- **"11 documents to review" was danger red.** A queue with work in it is a
  queue doing its job; that red is for "agreement declined" and "suspended".
- **`.admin-panel` had `border: 0`** and leaned on a soft shadow, so on a
  1180px column a white panel and the near-white ground had no edge between
  them.
- **The portal hand-rolled its inputs at an 8px radius** while the shared
  field every other surface uses is 14px.

---

## Deleted

Nine modules nothing imported, 694 lines:

```
components/portal/AccountBar.tsx          components/sections/NumberedSteps.tsx
components/sections/CustodyBand.tsx       components/sections/ProductShowcase.tsx
components/sections/FeatureTiles.tsx      components/sections/TrustMarquee.tsx
components/ui/badge.tsx                   components/ui/stepper.tsx
components/ui/table.tsx
```

`ProductShowcase` is worth calling out: **it was restyled to the reference
before anyone checked whether it was used.** It was not — the live formulary
card is `components/ProductCard.tsx`, and that work had to be redone on the
right file. `knip` could not run (its native parser has no binding for Node 21
on this machine), so the sweep was done by matching import specifiers against
every module.

`ui/table.tsx` and `ui/stepper.tsx` were asked for by the brief and are the
one thing deliberately not delivered — see
[`redesign-missing-content.md`](./redesign-missing-content.md) for why.

---

## Verification

| Gate | Result |
|---|---|
| `npm run build:check` | green |
| `npx tsc --noEmit` | clean |
| 19 marketing routes | all 200 |
| Horizontal overflow at 1440 | 0 on every page shot |
| Content modules vs `main` | byte-identical |
| Raw palette classes (`emerald-`, `red-`, `amber-`, `green-`) | 0 |
| `#dde4f0` / `#f5f8fd` anywhere in the repo | 0 |
| `ink-muted` contrast | 5.09 on white, 4.75 on `paper` |
| axe-core 4.14, WCAG 2 A + AA, 24 routes | 0 violations |

Screenshots in `docs/redesign-screenshots/` — phases 1–2 public, phase 3
signed in as the seeded VERIFIED partner, phase 4 signed in as the seeded
admin.

### axe

axe-core 4.14, WCAG 2.0/2.1 A and AA, run over CDP against **24 routes** —
every marketing page, plus the portal signed in as the seeded VERIFIED
partner and the admin console signed in as the seeded admin.

**Found 45 violations. All 45 fixed. Every route now returns clean.**

They fell into three groups, and two of them were caused by this redesign's
own ground change:

**Dark-band leftovers (11).** `invert` used to mean "this sits on a navy
band". The redesign has no navy bands — every surface is the one off-white
ground — so `.spec-invert .spec-body` was painting `text-white/65` body copy
on `#f7f7f5` for the whole of /about and /quality, `.link-arrow-invert` was
cyan-300 at under 2:1, and `LegalPage`'s header was the same. All repointed
to the light equivalents; `spec-invert` now means *quieter*, not *reversed*.

**Contrast (21).** `--admin-ink-50` was `#78829a`, which on the rail's
62%-white glass measures 3.72:1 — flagged sixteen times on one screen. Now
`#636e89`, the site's own `ink-muted`: 4.92:1 there, 5.09:1 on white, and a
muted label in the console is finally the same grey as one on the site. The
notification badge was `#d4483b` at 4.38:1 and is now `danger` at 6.57:1.
`opacity-80` on the "not yet" support card was multiplying a cyan-700 meta
line — a value picked precisely to clear 4.5:1 — below threshold; the dashed
border already said the same thing.

**Structure and naming (13).** `StatStrip` rendered `dl > div > a > dt`, so
assistive tech saw a definition list with no definitions in it: four labels
and four numbers, unpaired. `ProductCarousel` put `role="region"` on its
`<ul>`, and an explicit role *replaces* the implicit one — eight `<li>`
elements with no list to belong to and no "8 items" on focus. Two
`label-content-name-mismatch` pairs where the accessible name did not contain
the visible text, so a voice-control user saying the only word they can see
("Applied", "9+") addressed nothing.

None of these were introduced by the brief's visual changes except the first
group, which is exactly the kind of fault a ground change causes and exactly
why the audit was worth running.

---

## Still outstanding

1. **Rotate the GoHighLevel token.** A live `pit-…` value was committed to
   `.env.example` and has been on `origin/main` since `12baef3`. Unrelated to
   this work, not touched by it, and still needs doing.
