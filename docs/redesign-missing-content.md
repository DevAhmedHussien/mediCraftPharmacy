# Where the brief and the mocks disagree

The redesign brief and the HTML references in `design_handoff/` do not say the
same thing everywhere. Each conflict below was resolved in favour of the
**mock**, because the mock is the artefact the request pointed at ("make the
same this design"), and each is recorded here rather than decided quietly.

Nothing in this file is a content change. Every word of copy is as it was.

---

## 1. Product page — strengths

**The brief says** the product page shows "name, category and the Rx notice
only — no strengths".

**The mock shows** a three-column `dl` with Strength, Form and Category, ruled
top and bottom.

**Built as the mock.** The existing page already showed Strength / Form /
Route, so mock and current behaviour agree and nothing changed. Removing
strength from a 503A formulary page would also be a clinical regression, not
only a visual one — strength is how a prescriber identifies a preparation.

---

## 2. Refill — one card or two columns

**The brief says** the refill form is "one centred Card".

**The mock shows** a two-column `auto-fit` grid: "What to expect" on the left,
the form in a 28px card on the right.

**Built as the mock.**

---

## 3. Product page — sections the mock does not have

**The mock's product page** has exactly two headings: the product name and
"More in {category}".

**Our page** also has Specifications, Active/Inactive ingredients,
Description, Prescriber directions and the Rx notice — all real content from
`lib/data.ts`.

**Kept, and styled to the mock's vocabulary.** The brief is explicit that
content stays; dropping six content blocks to match a reference that was drawn
against placeholder data would have been the wrong reading.

---

## 4. Related compounds — carousel or grid

**The mock's** "More in {category}" is a plain `auto-fill` grid at a 250px
floor.

**Our page** uses `ProductCarousel` — a scroll-snap shelf with prev/next
controls.

**Kept as a carousel.** Swapping it for a grid would remove working keyboard
and pointer affordances to gain nothing visible; the slides were resized to
250px so a shelf card and a grid card are the same object.

---

## 5. Portal and admin rails — no reference for the mobile case

**The mock** draws the portal rail at desktop only. There is no reference for
what happens below `lg`.

**Built** as the existing app already did it: the rail is hidden, a 48px
header carries the logo and identity control, and a horizontal tab strip
carries the same gated section list. Only one of the desktop and mobile
identity controls is in the accessibility tree at any width.

---

## Not a conflict, but worth recording

**`ui/table.tsx` and `ui/stepper.tsx` were built and then deleted.** The brief
asked Phase 4 for "a shared ruled table" and for "PipelineRail/StatusTimeline
using shared Stepper". Both were written in Phase 1 in anticipation. By Phase
4 the live components — `SortableTable` (TanStack-backed, with sorting and
filtering that a plain ruled table cannot replace) and `StepTracker` /
`StatusTimeline` — already did those jobs and were already on the new tokens.
Retrofitting them would have cost working behaviour for visual parity they
already had. Shipping two table components where one is used is worse than
shipping one, so the unused pair was removed. Flagging it because it is the
one place the brief asked for something that was deliberately not delivered.
