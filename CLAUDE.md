# Working in this repo

## Before you style anything

Read [`docs/design-system.md`](./docs/design-system.md). It is the vocabulary
the whole application is built from.

**Do not type a hex, a radius or a shadow into a component.** Every one you
need is a token. The four faults that cost the most in the redesign were all
the same shape — a value written by hand where a named one already existed:

- ten hardcoded status hexes in `components/admin/ui.tsx`, which is how the
  only green in the application ended up beside the brand blue;
- `#2f855a` for one bar in `PipelineFunnel`;
- `#f5f8fd` / `#dde4f0` duplicated into `lib/og.tsx` and `lib/services/email.ts`;
- `#78829a` for every console micro-label, at 3.72:1.

`theme()` does **not** resolve inside a React `style={{}}` attribute — that is
plain CSS. Use the `--status-*` / `--admin-*` CSS variables there.

## Before you write a component

**Check whether it exists.** `Textarea` and `Select` were written twice
because `components/ui/input.tsx` was not read first, and `ui/table.tsx` and
`ui/stepper.tsx` shipped and were deleted unused because `SortableTable` and
`StepTracker` already did the job.

**Check whether the file you are editing is imported.** `ProductShowcase` was
restyled to the reference in full before anyone checked — it was dead code,
and the live formulary card is `components/ProductCard.tsx`. One grep first:

```sh
grep -rlw ComponentName app components lib
```

## Geometry

`.container-x` is `max-w-[1120px] px-5` — one measure, one flat gutter.
Anything that bleeds past it with a negative margin must pay back **exactly
20px**, or it slices its last child down the middle.

Never use `container-narrow` for prose on a page whose other sections use
`container-x`. It centres itself, which gives one page two left edges. Cap the
measure *inside* the container instead.

## Accessibility

Run axe before claiming a screen is done:

```sh
node --experimental-websocket scripts/axe.mjs <path-to-axe.min.js> / /login …
```

Three failures this codebase has made more than once:

- **An explicit `role` replaces the implicit one.** `role="region"` on a
  `<ul>` orphans every `<li>` inside it. Put the role on a wrapper.
- **A `<dl>` may only directly contain `dt`, `dd`, `div`, `script`,
  `template`** — and a `div` inside it may only contain `dt`/`dd`. An `<a>`
  anywhere in that chain leaves a definition list with no definitions.
- **An `aria-label` must contain the element's visible text.** Otherwise a
  voice-control user saying the only word they can see addresses nothing.

Any colour pair must clear 4.5:1 **on its own background and on `paper`** —
status chips appear in white panels and directly on the ground.

## Don't

- `git add -A`. Stage with explicit paths and check `git status` first; other
  branches' work lives in this checkout.
- Run `next build` into `.next` while the dev server is running — the repo's
  own `next.config.js` warns about it, and it breaks the running server.
- Server-render `opacity: 0`. A `whileInView` reveal with
  `initial={{ opacity: 0 }}` ships content invisible to anything that does not
  run the animation.
- Push or deploy without being asked.
