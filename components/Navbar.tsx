"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { IconName } from "@/components/icons/set";
import { NavDrawer } from "@/components/nav/NavDrawer";
import { headerNav, navCtas, type HeaderNavItem } from "@/lib/site";

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
      <div className="rounded-full border border-white/90 bg-white/[0.62] shadow-glass backdrop-blur-xl backdrop-saturate-150">
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
            {headerNav.map((item) =>
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
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href="/products"
                aria-expanded={openMenu === "products"}
                onFocus={() => setOpenMenu("products")}
                onClick={() => setOpenMenu(null)}
                className={cn("nav-link flex items-center gap-1", productsActive && "nav-link-active")}
              >
                Products
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-ink-muted transition-transform duration-200",
                    openMenu === "products" && "rotate-180"
                  )}
                  strokeWidth={2}
                />
                <span
                  aria-hidden
                  className={cn("nav-underline", productsActive && "nav-underline-on")}
                />
              </Link>

              <MegaPanel categories={categories} open={openMenu === "products"} onNavigate={() => setOpenMenu(null)} />
            </div>
          </div>

          {/* ---- The ways in ----
              Three, in increasing commitment: sign in if you already have an
              account, refill if you are a patient, open one if you are not.
              The portal link is a quiet text link rather than a third button —
              three buttons side by side is three primary actions, which is
              none. */}
          <div className="hidden shrink-0 items-center gap-4 lg:flex">
            {account ? (
              <Link
                href={account.href}
                className="flex items-center gap-1.5 text-caption font-medium text-ink-soft transition-colors hover:text-ink"
              >
                <UserRound className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                {account.label}
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 whitespace-nowrap text-[14px] font-normal text-ink-soft transition-colors hover:text-navy"
              >
                {/* "Sign in", per the reference. It said "Provider portal",
                    which names a destination rather than the action — and
                    staff sign in here too, so the old label was also wrong
                    for half the people using it. */}
                <UserRound className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                Sign in
              </Link>
            )}

            <span aria-hidden className="h-4 w-px bg-line" />

            <div className="flex items-center gap-2.5">
              {navCtas.map((cta) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  /* Pills, matching the hero's buttons. Navy solid goes to
                     brand blue on hover — the handoff's one hover move,
                     applied everywhere a solid pill appears. */
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-full px-[18px] py-2.5 text-[14px] font-medium transition-colors duration-200",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                    "motion-reduce:transition-none",
                    cta.style === "primary"
                      ? "bg-navy text-white hover:bg-brand-500"
                      : "border border-hair bg-white/70 text-navy hover:bg-white"
                  )}
                >
                  {cta.label}
                </Link>
              ))}
            </div>
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

  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <button
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

      <div
        id={panelId}
        role="region"
        aria-label={item.label}
        className={cn(
          /* 94% opaque, per the reference — not the 72% the nav pill uses.
             The pill floats over the page ground; this panel hangs over page
             CONTENT, and at 72% the hero headline read straight through it. */
          "absolute left-0 top-full mt-2 overflow-hidden rounded-card border border-white/95 bg-white/[0.94] shadow-menu backdrop-blur-[24px] backdrop-saturate-150 transition-opacity duration-150 motion-reduce:transition-none",
          promo ? "w-[40rem]" : "w-[22rem]",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        hidden={!open}
      >
        <div className={cn("p-2", promo && "grid grid-cols-[1fr_15rem] gap-2")}>
          <ul>
            {item.children?.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onClose}
                  className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/80 motion-reduce:transition-none"
                >
                  <span className="block text-[14px] font-medium text-navy">{child.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted">
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
              className="group/promo relative flex flex-col justify-end overflow-hidden rounded-xl bg-stone p-4"
            >
              <Image
                src={promo.src}
                alt=""
                fill
                sizes="15rem"
                className="object-cover transition-transform duration-300 group-hover/promo:scale-[1.03] motion-reduce:transform-none"
              />
              <span className="relative">
                <span className="block font-mono text-[10.5px] uppercase tracking-eyebrow text-white/80">
                  {promo.eyebrow}
                </span>
                <span className="mt-1 block text-[14px] font-medium leading-snug text-white">
                  {promo.title}
                </span>
              </span>
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-navy/80 to-navy/10"
              />
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
      className={cn(
        "absolute inset-x-0 top-full transition-[opacity,visibility] duration-200",
        open ? "visible opacity-100" : "invisible opacity-0"
      )}
    >
      {/* The mega-panel, as a glass sheet rather than a white band with a
          rule under it. It sits below a floating pill now, so a full-bleed
          bar with a hard bottom border read as a second header. */}
      <div className="mx-auto w-full max-w-[1120px] px-5">
        <div className="overflow-hidden rounded-card border border-white/95 bg-white/[0.94] shadow-menu backdrop-blur-[24px] backdrop-saturate-150">
        <div className="container-x grid gap-10 py-9 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="eyebrow">Shop by category</p>

            <div className="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => {
                const count = c.count;
                return (
                  <Link
                    key={c.slug}
                    href={`/products/${c.slug}`}
                    onClick={onNavigate}
                    className="group/item flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {/* A rule, not a thumbnail.
                        Eleven packshots in a menu is eleven images fetched to
                        decorate a list of eleven words, and the words are what
                        anyone reads. */}
                    <span
                      aria-hidden
                      className="h-8 w-px shrink-0 bg-line transition-colors group-hover/item:bg-brand-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-meta font-bold text-ink">
                        {c.name}
                      </span>
                      {/* Counts are data, so mono — and omitted rather than
                          shown as a bare zero where nothing is published. */}
                      <span className="block font-mono text-caption text-ink-muted">
                        {count > 0
                          ? `${count} ${count === 1 ? "product" : "products"}`
                          : "On request"}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-hair pt-5">
              <Link href="/products" className="link-arrow text-meta">
                View the full formulary
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <p className="fine-print">
                All formulations require a valid prescription from a licensed provider.
              </p>
            </div>
          </div>

          {/* A quiet aside, not a picture.
              The panel used to carry a product square the size of the menu's
              whole right-hand column — a lot of weight for decoration beside a
              list someone opened to navigate. */}
          <div className="hidden self-start rounded-card border border-hair-soft bg-white/70 p-6 lg:block">
            <p className="text-[1.0625rem] font-bold leading-snug text-ink text-balance">
              Request the current formulary for your specialty
            </p>
            <p className="mt-2 text-caption leading-relaxed text-ink-soft">
              A pharmacy liaison responds within one business day.
            </p>
            <Link href="/contact" className="btn-primary btn-sm mt-5">
              Request formulary
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
