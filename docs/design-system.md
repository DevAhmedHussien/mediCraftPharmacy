# MediCraft design system

The vocabulary the redesign is built from. Everything here is a token or a
class — if you are about to type a hex, a radius or a shadow into a component,
the thing you want is probably already named below.

## Ground and hairlines

| Token | Value | What it is |
|---|---|---|
| `paper` | `#f7f7f5` | The page ground. Every screen sits on this. |
| `stone` | `#ecedef` | Image plates — the surface a packshot sits on. |
| `tint` | `#eef2ff` | The pale-blue callout panel. |
| `hair-soft` | `#ecece7` | Card borders. |
| `hair` | `#e3e3de` | Dividers and table rules. |
| `hair-strong` | `#dadad4` | The heavier rule on a step list; dashed empty states. |

Three hairlines because the reference uses three. One grey doing all three
jobs is what makes a page look like a wireframe.

**`sand` and `line` are aliases, not a second palette.** `sand` *is* `paper`,
`line` *is* `hair`. They are kept because ~60 marketing call sites reference
them. New markup should use the redesign names.

## Brand

`brand-500` `#1b54fb` is the exact logo blue; `brand-950` / `navy` `#0d193e`
the exact brand navy; `cyan-400` `#23dce1` the pestle cyan. These are measured
from the identity deck, not eyeballed — do not nudge them.

**Blue means "link".** Headings are navy. A card heading in brand blue is the
reason "Phone", "Business Hours" and "Follow MediCraft" all looked clickable
on /contact and none were.

## Status

Four semantic pairs. Each `fg` clears 4.5:1 on its own `bg` **and** on the
page ground, because these appear both inside white panels and directly on it.

| Tone | fg | bg | on bg | on paper |
|---|---|---|---|---|
| `success` | `#0b6e74` | `#e3f7f7` | 5.41 | 5.60 |
| `warning` | `#8a5a00` | `#fff4dd` | 5.43 | 5.53 |
| `danger` | `#b42318` | `#fdecea` | 5.75 | 6.13 |
| `info` | `#1b54fb` | `#eef2ff` | 5.07 | 5.28 |

`success` is cyan, not green. The identity has no green; a green tick beside a
cyan brand mark is a third colour nobody chose.

**`danger` is for failure, not for volume.** A queue with eleven things in it
is a queue doing its job. Colouring it the same red as "agreement declined"
teaches operators to read that red as "there is work", which is the wrong
lesson for the day something actually breaks. Use `warning`.

CSS variables `--status-{tone}-{fg,bg}` exist for the same values, because
`theme()` does **not** resolve inside a React `style={{}}` attribute — that is
plain CSS, and `theme(colors.danger.fg)` there ships as a literal invalid
string.

## Type

Two families. **Satoshi** carries the lockup, display type and UI; **IBM Plex
Mono** carries regulatory micro-data and structural micro-labels. Never mono
for prose.

Display type is Satoshi **400**, not bold, pulled in hard: `tracking-display`
(-0.045em) for h1, `tracking-title` (-0.035em) for h2. At 88px the default
tracking reads as gaps between letters rather than as a word.

**Micro-labels are mono at normal weight**, `tracking-eyebrow` (0.12em),
uppercase. Not bold sans. That register is what tells a field label from a
short value set at the same size — bolding it does not.

## Geometry

| Token | Value | Used for |
|---|---|---|
| `rounded-card` | 24px | Cards, panels, the rail |
| `rounded-hero` | 32px | Hero images, CTA panels, packshot plates |
| `rounded-2xl` | 16px | Inner plates inside a card |
| `rounded-[14px]` | 14px | Form fields |
| `rounded-full` | — | Every button, every pill |

**`.container-x` is `max-w-[1120px] px-5`** — one measure, one flat gutter, no
breakpoint steps. The nav pill, the home page and `PageHeader` are all 1120.
Anything that bleeds past it with a negative margin must pay back exactly
20px, or it slices its last child down the middle.

Section rhythm: the home page is 96/160px and sets its own with a local
constant. Interior pages are `.section` at 80/112, because they open with a
`PageHeader` that already carries 96px of top padding.

## Shadows

`shadow-glass` and `shadow-float` both lead with `inset 0 1px 0 rgba(255,255,255,.x)`.
That inset white top line is what reads as glass; without it a translucent
fill just looks faded. `shadow-menu` is deeper and wider because a dropdown
hangs over content rather than sitting on it.

Shadows are tinted with the navy, never black, so every card sits in one light.

## Components to reach for

| Need | Use |
|---|---|
| Any button or CTA | `components/ui/button.tsx` — `Button`, with `asChild` for links |
| Any text input | `components/ui/input.tsx` |
| An interior page hero | `PageHeader` / `PageHeaderImage`, or `PageHero` in `blocks.tsx` |
| A frosted surface | `Glass`, `Card`, `SurfaceCard` in `components/ui/glass.tsx` |
| A status chip | `StatusBadge` (admin vocabulary) over `Pill` (raw tone) |
| A sortable console table | `components/admin/SortableTable.tsx` |
| A console panel | `.admin-panel`, or `.admin-panel-lead` for the one call to action per screen |

**Check before you write one.** `Textarea` and `Select` were duplicated once
because `input.tsx` was not read first, and two table components shipped where
one was used.

## The two shells are one object

The partner portal and the admin console share a geometry: `260px | 1fr`, a
sticky glass rail in a 16px gutter, mono group headings, a white chip for the
current item, and the identity control in the page header on desktop. They are
one piece of furniture seen from two sides. Change one, change both.
