"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { IconName } from "@/components/icons/set";
import { NavDrawer } from "@/components/nav/NavDrawer";
import { headerNav, type HeaderNavItem } from "@/lib/site";

import type { CategoryThumb } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * One bar: the lockup, the navigation, and the three ways in.
 *
 * IT WAS TWO BARS.
 * ----------------
 * A utility strip sat above this one carrying the location, the opening
 * hours, the phone number, a Contact link and a Portal Login link — 36px of
 * the first screen, on top of a 72px bar, for five facts of which three were
 * already in the footer and two were already in the bar directly beneath it.
 * It then slid away on scroll, which meant the chrome had two heights and
 * every sticky sub-bar on the site had to know both.
 *
 * What was actually load-bearing in that strip was the portal login, so that
 * moved into the actions at the right edge where the other two entry points
 * already are. The location and hours belong to the footer, which is where
 * someone looks for them.
 *
 * Still a client component, for two things a server component cannot do:
 *   · mark the current route, so a visitor always knows where they are
 *   · keep the Products panel open on hover *and* on keyboard focus
 *
 * The mega-panel's markup is always present in the DOM regardless of state, so
 * every category link is server-rendered and crawlable.
 */

/**
 * One entry in the products menu, resolved on the server.
 *
 * The nav is a client component and the catalogue is in the database, so the
 * whole menu is assembled once in the site layout and handed down. It used to
 * import a static array, which is why adding a category needed a deploy.
 */
export type NavCategory = {
  slug: string;
  name: string;
  blurb: string;
  icon: IconName;
  count: number;
  /** Square thumbnail for the menu. Null where the category has no products. */
  thumb: CategoryThumb | null;
  products: { slug: string; name: string; form: string; doses: string }[];
};

/** Who is signed in, as much of it as the header needs. */
export type HeaderAccount = { name: string; href: string; label: string } | null;

export function Navbar({
  categories,
  account,
}: {
  categories: NavCategory[];
  account: HeaderAccount;
}) {
  const pathname = usePathname();

  /* The products menu is state-driven rather than a CSS :hover.
   *
   * As pure hover it had no way to close: clicking a category navigated, the
   * new page rendered underneath, and the panel stayed open until the pointer
   * happened to leave it. A menu that outlives the choice it was opened for is
   * the thing people describe as "it does not close". */
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Any navigation closes it, however it was triggered.
  useEffect(() => setOpenMenu(null), [pathname]);

  /* Whether the page has moved, for the pill's colour only.
   *
   * ONE passive listener, rAF-throttled, and it writes a boolean rather than
   * a scroll position — so a fast scroll schedules at most one frame of work
   * and React re-renders at most twice in a session. A listener that set
   * `scrollY` into state would re-render the header on every frame of every
   * scroll, on every page.
   *
   * The pill then transitions in CSS. Nothing here animates. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMenu]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const productsActive = pathname.startsWith("/product");

  return (
    /* A floating glass pill, not a full-width bar.
     *
     * `sticky`, not `fixed`. Fixed took the header out of flow, so every page
     * compensated with top padding driven by `--chrome-h`; sticky keeps it in
     * flow and that compensation becomes unnecessary — the pill simply sits
     * 16px down and stays there.
     *
     * The blur is progressive enhancement. Without backdrop-filter the 62%
     * white fill still reads as a solid pill on the paper ground, so nothing
     * about the layout or the legibility depends on it.
     *
     * Everything inside — the dropdowns, the mega-panel, the mobile drawer,
     * the active-route logic — is untouched. This is a restyle of the shell. */
    <header className="sticky top-4 z-50 mx-auto mt-4 w-full max-w-[1120px] px-5">
      {/* ---- The pill ---- */}
      {/* `relative` so BOTH dropdowns position against the pill rather than
          against their own button. The reference spans its panels edge to
          edge of the header; anchored to a button they were 640px boxes that
          jumped sideways as you moved between The pharmacy and Products. */}
      {/* CLOSING IS HANDLED HERE, NOT ON EACH GROUP.
      
          The panels position against this pill, so `top-full` is the PILL's
          bottom, not the trigger's — and the 10-22px between a trigger and
          its panel is this element's own bottom padding. It belongs to
          neither the group nor the panel, so a per-group `onMouseLeave`
          fired the moment the pointer entered it: the menu shut 2px below
          the button, every time, and the links were unreachable by mouse.
      
          One `onMouseLeave` on the pill instead. Triggers still open on
          enter (and switch between each other); only leaving the whole
          header closes. The pointer cannot cross a dead band because there
          is no longer one to cross. */}
      <div
        onMouseLeave={() => setOpenMenu(null)}
        data-scrolled={scrolled ? "" : undefined}
        className="relative rounded-full border border-white/90 bg-white/[0.62] shadow-glass backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none data-[scrolled]:border-white data-[scrolled]:bg-white/[0.82] data-[scrolled]:shadow-float"
      >
        <nav className="flex items-center justify-between gap-6 py-2.5 pl-[22px] pr-2.5">
          {/* `.logo-lockup` is the hover/focus target that drives the grind. */}
          <Link
            href="/"
            className="logo-lockup flex shrink-0 items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Logo className="h-[30px] w-auto" />
          </Link>

          {/* ---- Desktop navigation ---- */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {/* The reference orders the bar:
                  The pharmacy · Products · For providers · Compounding notes · Contact
                Products sits SECOND, not last. It was rendered after the
                `headerNav` loop because it owns a full-bleed mega-panel and
                is not in that data — so its markup position had silently
                become its visual position. It is interleaved now: everything
                before it, then Products, then the rest. */}
            {headerNav.slice(0, 1).map((item) =>
              item.children ? (
                <NavGroup
                  key={item.label}
                  item={item}
                  /* The reference puts one image card beside the pharmacy
                     links. Copy is the chain-of-custody section's own, so
                     nothing new was invented for it. */
                  promo={
                    item.label === "The pharmacy"
                      ? {
                          href: "/quality",
                          src: "/images/site/mc-hero-custody.webp",
                          eyebrow: "Chain of custody",
                          title: "Every package filmed. Every shipment tracked.",
                        }
                      : undefined
                  }
                  open={openMenu === item.label}
                  active={item.children.some((child) => isActive(child.href))}
                  onOpen={() => setOpenMenu(item.label)}
                  onClose={() => setOpenMenu(null)}
                />
              ) : (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isActive(item.href)}
                />
              )
            )}

            {/* Products, with a full-bleed mega-panel. */}
            <div
              className="static"
              onMouseEnter={() => setOpenMenu("products")}
              onKeyDown={(event) => {
                if (event.key === "Escape" && openMenu === "products") {
                  event.stopPropagation();
                  setOpenMenu(null);
                }
              }}
            >
              {/* A BUTTON, like the pharmacy trigger and like the reference.
                  It was a <Link> carrying `aria-expanded` — a control that
                  announces itself as expandable and then navigates away when
                  you activate it, with no `aria-controls` pointing at the
                  thing it expands. /products is still one click away: it is
                  "View the full formulary" at the top of the panel, which is
                  where the reference puts it. */}
              <button
                type="button"
                aria-expanded={openMenu === "products"}
                aria-controls="nav-panel-products"
                onClick={() => setOpenMenu(openMenu === "products" ? null : "products")}
                onFocus={() => setOpenMenu("products")}
                className={cn("nav-link flex items-center gap-1", productsActive && "nav-link-active")}
              >
                Products
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-3.5 w-3.5 text-ink-muted transition-transform duration-200 motion-reduce:transition-none",
                    openMenu === "products" && "rotate-180"
                  )}
                  strokeWidth={2}
                />
                <span
                  aria-hidden
                  className={cn("nav-underline", productsActive && "nav-underline-on")}
                />
              </button>

              <MegaPanel categories={categories} open={openMenu === "products"} onNavigate={() => setOpenMenu(null)} />
            </div>

            {headerNav.slice(1).map((item) =>
              item.children ? (
                <NavGroup
                  key={item.label}
                  item={item}
                  open={openMenu === item.label}
                  active={item.children.some((child) => isActive(child.href))}
                  onOpen={() => setOpenMenu(item.label)}
                  onClose={() => setOpenMenu(null)}
                />
              ) : (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isActive(item.href)}
                />
              )
            )}

          </div>

          {/* ---- The ways in ----
              Three, in increasing commitment: sign in if you already have an
              account, refill if you are a patient, open one if you are not.
              The portal link is a quiet text link rather than a third button —
              three buttons side by side is three primary actions, which is
              none. */}
          <div className="hidden shrink-0 items-center gap-4 lg:flex">
            {/* The reference's trailing cluster, in its order:
                  Patient Refill · Sign in · [Open an Account]

                Only the last is a pill. Patient Refill was an outline pill,
                which gave the header two competing buttons and made a
                patient-facing link look like the primary action on a page
                whose primary action is opening a provider account.

                No divider rule — the mock has none, and the pill already
                separates the actions from the links.

                They drop out in order as the pill narrows: Patient Refill
                first, then Sign in. That is what `navTertiary` and
                `navSecondary` do in the reference. */}
            <Link
              href="/refill"
              className="hidden whitespace-nowrap px-3 py-2 text-[14px] text-ink-soft transition-colors hover:text-navy motion-reduce:transition-none xl:block"
            >
              Patient Refill
            </Link>

            <Link
              href={account ? account.href : "/login"}
              className="hidden whitespace-nowrap px-3 py-2 text-[14px] text-ink-soft transition-colors hover:text-navy motion-reduce:transition-none lg:block"
            >
              {/* No icon. The reference has none, and a person glyph beside
                  a two-word link is decoration competing with the one real
                  button in the header. */}
              {account ? account.label : "Sign in"}
            </Link>

            <Link
              href="/work-with-us"
              className={cn(
                "inline-flex items-center whitespace-nowrap rounded-full bg-navy px-[18px] py-2.5 text-[14px] font-medium text-white",
                "transition-colors duration-200 hover:bg-brand-500 motion-reduce:transition-none",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              )}
            >
              Open an Account
            </Link>
          </div>

          <NavDrawer categories={categories} account={account} />
        </nav>
      </div>
    </header>
  );
}

/**
 * A top-level item that opens a small panel of related pages.
 *
 * Exists because the header outgrew a single row: nine flat links wrapped onto
 * two lines. Grouping the four pharmacy pages under one item is what makes room
 * for Compounding notes and Contact, which had nowhere to go before.
 *
 * The parent is a real link as well as a trigger — "The pharmacy" goes to
 * /about — so the item is never a dead end for anyone who clicks rather than
 * hovers, and the panel markup always renders so every link is crawlable.
 */
/* ===========================================================================
   A header dropdown, per the Home reference.

   A <button>, NOT a link. The trigger opens a panel; it does not navigate.
   It was a <Link href={item.href}> carrying `aria-expanded`, which told a
   screen reader "expandable" and then took the user to /about when they
   pressed Enter — the one key they would use to expand it. The parent route
   is still reachable: it is the first item inside the panel.

   The panel is `role="region"` with an `aria-label`, not `role="menu"`.
   These are ordinary links to ordinary pages, and a menu role promises
   arrow-key semantics that plain links do not implement — announcing a
   contract the markup does not keep is worse than announcing nothing.

   Opens on hover AND on click, closes on Escape. Hover alone is unusable
   without a pointer; click alone loses the browse-by-hover that makes a
   desktop nav quick.
   ========================================================================= */
function NavGroup({
  item,
  open,
  active,
  onOpen,
  onClose,
  promo,
}: {
  item: HeaderNavItem;
  open: boolean;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** The reference puts one image card beside the links. */
  promo?: { href: string; src: string; eyebrow: string; title: string };
}) {
  const panelId = `menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      /* Deliberately not `relative` — see the note on the pill. The panel
         inside positions against the header, not against this button. */
      onMouseEnter={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          onClose();
          /* Escape must put focus back on the trigger.
          
             Without this the panel closes and focus falls to the document —
             measured: after Esc, `document.activeElement` was <body>. A
             keyboard user who opens a menu, looks, and backs out has lost
             their place in the page and has to tab from the top again. */
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? onClose() : onOpen())}
        onFocus={onOpen}
        className={cn("nav-link flex items-center gap-1", active && "nav-link-active")}
      >
        {item.label}
        <ChevronDown
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 text-ink-muted transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
        <span aria-hidden className={cn("nav-underline", active && "nav-underline-on")} />
      </button>

      {/* FULL HEADER WIDTH, like the reference — not a box anchored under its
          own button. The panel is positioned against the header's inner
          container, so both menus open to the same edges and the page does
          not appear to shift sideways when you move between them. */}
      {/* THE GAP BETWEEN TRIGGER AND PANEL IS PART OF THE HOVER TARGET.
      
          The panel used to start at `top-[calc(100%+0.625rem)]`, which left
          10-21px belonging to neither the button nor the panel. Moving the
          pointer down to click a link crossed that dead band, `mouseleave`
          fired on the wrapper, and the menu shut before you arrived —
          measured closing 2px below the button, 19px short of the panel.
      
          So the positioner starts at `top-full` — flush with the button —
          and pays the visual offset in PADDING. The gap is now inside the
          element you are already hovering, so the pointer never leaves. */}
      <div
        hidden={!open}
        className={cn(
          "absolute inset-x-0 top-full pt-2.5",
          !open && "pointer-events-none"
        )}
      >
      <div
        id={panelId}
        role="region"
        aria-label={item.label}
        className={cn(
          /* OPAQUE, not frosted — and this is a correction, not a preference.
          
             The panel carried `bg-white/[0.94]` with `backdrop-blur-[24px]`,
             copied from the reference. It cannot work here: the pill it
             lives inside has its own `backdrop-filter`, which makes the pill
             a BACKDROP ROOT, and a descendant's backdrop-filter may only
             sample within that root. So the blur sampled the pill's own
             near-transparent background, did nothing, and left 6% of the
             page showing through — which over an 88px hero headline is not
             6% of nothing, it is a legible word sitting behind a menu.
          
             Solid white, with the hairline and the menu shadow carrying the
             separation instead. Also cheaper: a backdrop-filter that blurs
             nothing still costs a compositing pass on every frame. */
          "rounded-card border border-hair-soft bg-white p-3 shadow-menu",
          /* The one piece of motion on the header, and it answers an action:
             the panel rises 6px as it fades, so it reads as coming OUT of
             the pill rather than appearing on top of the page. 160ms — long
             enough to see the direction, short enough that a second menu
             opened straight after does not feel queued. */
          "transition-[opacity,transform] duration-[160ms] ease-out motion-reduce:transition-none",
          promo ? "lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(15rem,1fr)] lg:gap-3" : "",
          open
            ? "translate-y-0 opacity-100"
            : "-translate-y-1.5 opacity-0 motion-reduce:translate-y-0"
        )}
      >
        {/* `auto-fit` at 220px: four links land as 2x2 in the wide column and
            as one column on a narrow one, with no breakpoint to maintain. */}
        <ul
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13.75rem), 1fr))" }}
        >
          {item.children?.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onClose}
                className="flex flex-col gap-1 rounded-2xl px-4 py-3.5 transition-colors hover:bg-stone focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 motion-reduce:transition-none"
              >
                <span className="text-[0.9375rem] font-medium text-navy">{child.label}</span>
                <span className="text-[0.8125rem] leading-[1.45] text-ink-soft">
                  {child.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {promo && (
          <Link
            href={promo.href}
            onClick={onClose}
            className="group/promo relative mt-3 hidden min-h-[11.25rem] overflow-hidden rounded-2xl bg-stone lg:mt-0 lg:block"
          >
            <Image
              src={promo.src}
              alt=""
              fill
              sizes="22rem"
              className="object-cover transition-transform duration-300 group-hover/promo:scale-[1.03] motion-reduce:transform-none"
            />
            {/* A caption CARD inset from the edges, as the reference draws it
                — not a gradient washing the whole image. The gradient dimmed
                the photograph to make two lines of text legible; a small
                frosted plate leaves the image alone and is easier to read. */}
            <span className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-0.5 rounded-xl bg-navy/[0.72] px-3.5 py-3 backdrop-blur-[10px]">
              <span className="font-mono text-[0.65625rem] uppercase tracking-eyebrow text-cyan-400">
                {promo.eyebrow}
              </span>
              <span className="text-[0.875rem] font-medium leading-snug text-white">
                {promo.title}
              </span>
            </span>
          </Link>
        )}
      </div>
      </div>
    </div>
  );
}

/** A top-level link with an animated active/hover indicator. */
function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("nav-link group/link", active && "nav-link-active")}
    >
      {label}
      {/* Grows from the centre on hover; already full width when active. */}
      <span aria-hidden className={cn("nav-underline", active && "nav-underline-on")} />
    </Link>
  );
}

/**
 * The Products mega-panel: every category in a grid, a featured still, and one
 * clear route into the full formulary.
 *
 * Revealed with CSS on `group-hover` / `group-focus-within` — no state, so the
 * panel cannot get stuck open, and it works before hydration.
 */
function MegaPanel({
  categories,
  open,
  onNavigate,
}: {
  categories: NavCategory[];
  open: boolean;
  onNavigate: () => void;
}) {
  return (
    <div
      // `invisible` rather than unmounted, so the panel keeps its place in the
      // tab order and the transition has something to animate.
      id="nav-panel-products"
      role="region"
      aria-label="Products"
      className={cn(
        /* `pt-2.5`, not `mt-2.5` on the child — see the note in NavGroup.
           A margin leaves the gap outside this box; padding puts it inside,
           so the pointer stays within the element the whole way down. */
        "absolute inset-x-0 top-full pt-2.5 transition-[opacity,transform,visibility] duration-[160ms] ease-out motion-reduce:transition-none",
        open
          ? "visible translate-y-0 opacity-100"
          : "invisible -translate-y-1.5 opacity-0 motion-reduce:translate-y-0"
      )}
    >
      {/* The mega-panel, as a glass sheet rather than a white band with a
          rule under it. It sits below a floating pill now, so a full-bleed
          bar with a hard bottom border read as a second header. */}
      <div className="w-full">
        {/* 12px of padding and 8px between the three stacked parts, as the
            reference has it — the panel is a tray holding rounded rows, not a
            bordered card with a layout inside it. */}
        <div className="flex flex-col gap-2 rounded-card border border-hair-soft bg-white p-3 shadow-menu">
          {/* The eyebrow and the formulary link share one line at the TOP.
              The link used to sit in a ruled footer at the bottom, below
              eleven rows, which is the last place someone scanning
              categories is looking for "show me all of them". */}
          <div className="flex items-baseline justify-between gap-4 px-4 pb-1 pt-2">
            <p className="eyebrow">Shop by category</p>
            <Link
              href="/products"
              onClick={onNavigate}
              className="shrink-0 text-[0.84375rem] font-medium text-brand-500 transition-colors hover:text-navy motion-reduce:transition-none"
            >
              View the full formulary <span aria-hidden>→</span>
            </Link>
          </div>

          {/* `auto-fill` at a 200px floor rather than 2/3 columns at named
              breakpoints: eleven categories divide badly into three, and the
              reference lets the panel fit as many as its width allows. */}
          <ul
            className="grid gap-0.5"
            /* 15rem, not the reference's 200px. Its mock shows a fixed
               "ON REQUEST" beside every name; ours shows a real count, so
               the name had less room and "Weight Management" came out as
               "Weight Mana…". A truncated category is not a category. */
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15rem), 1fr))" }}
          >
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products/${c.slug}`}
                  onClick={onNavigate}
                  className="flex items-center justify-between gap-2.5 rounded-[14px] px-4 py-3 text-[0.90625rem] text-navy transition-colors hover:bg-stone focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 motion-reduce:transition-none"
                >
                  <span className="min-w-0">{c.name}</span>
                  {/* Counts are data, so mono — and "On request" rather than
                      a bare zero where nothing is published yet. */}
                  <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-muted">
                    {c.count > 0
                      ? `${c.count} ${c.count === 1 ? "product" : "products"}`
                      : "On request"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* The prescription notice and the one action, on a tinted rail at
              the foot. It replaces a right-hand column that held a card the
              size of the menu — a lot of weight for one sentence beside a
              list someone opened in order to navigate. */}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone px-4 py-3.5">
            <p className="text-[0.84375rem] text-ink-soft">
              All formulations require a valid prescription from a licensed provider.
              A pharmacy liaison responds within one business day.
            </p>
            <Link href="/contact" onClick={onNavigate} className="btn btn-primary btn-sm shrink-0">
              Request formulary
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
