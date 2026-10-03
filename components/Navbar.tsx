"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Phone, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/icons/set";
import { NavDrawer } from "@/components/nav/NavDrawer";
import {
  headerNav,
  navCtas,
  site,
  topbar,
  hasRealPhone,
  telHref,
  type HeaderNavItem,
} from "@/lib/site";

import { media, type CategoryThumb } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Two-tier chrome: a navy utility strip carrying the facts a prescriber checks
 * first, then a white header with the lockup, navigation and the two calls to
 * action.
 *
 * A client component, for three things a server component cannot do:
 *   · mark the current route, so a visitor always knows where they are
 *   · condense on scroll — the utility strip slides away and the bar tightens,
 *     which gives long regulatory pages their vertical space back
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
  const [condensed, setCondensed] = useState(false);

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

  useEffect(() => {
    // Threshold matches the topbar's height, so the strip is fully gone by the
    // time it would otherwise be half-clipped.
    const onScroll = () => setCondensed(window.scrollY > 36);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const productsActive = pathname.startsWith("/product");

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* ---- Utility topbar ----
          Collapses to zero height on scroll rather than unmounting, so the
          transition is a single smooth movement and nothing reflows. */}
      <div
        className={cn(
          "hidden overflow-hidden bg-navy text-white/70 transition-[height,opacity] duration-300 md:block",
          condensed ? "h-0 opacity-0" : "h-9 opacity-100"
        )}
      >
        <div className="container-x flex h-9 items-center justify-between gap-6 text-caption">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Icon name="pin" className="h-3.5 w-3.5 text-cyan-300" />
              {topbar.location}
            </span>
            <span aria-hidden className="text-white/20">
              |
            </span>
            <span>{topbar.hours}</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href={telHref() ?? "/contact"}
              className="flex items-center gap-1.5 font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={1.8} />
              {hasRealPhone ? site.phone : "Contact us"}
            </a>
            <span aria-hidden className="text-white/20">
              |
            </span>
            <Link href="/contact" className="transition-colors hover:text-white">
              Contact
            </Link>
            <span aria-hidden className="text-white/20">
              |
            </span>
            {/* Same tab, and a Link rather than an anchor: the portal is part
                of this site, not somewhere else. Opening it in a new tab left
                the visitor with two windows and a back button that did
                nothing.

                Signed in, it names where you are going instead of offering a
                sign-in you have already done. */}
            {account ? (
              <Link
                href={account.href}
                className="flex items-center gap-1.5 transition-colors hover:text-white"
              >
                <UserRound className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                {account.label}
              </Link>
            ) : (
              <Link href="/login" className="transition-colors hover:text-white">
                Provider Portal Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ---- Main bar ---- */}
      <div
        className={cn(
          "chrome border-b transition-[box-shadow,border-color] duration-300",
          condensed ? "border-line" : "border-line/70"
        )}
      >
        <nav
          className={cn(
            "container-x flex items-center justify-between gap-6 transition-[height] duration-300",
            condensed ? "h-[3.75rem]" : "h-[4.5rem]"
          )}
        >
          {/* `.logo-lockup` is the hover/focus target that drives the grind. */}
          <Link
            href="/"
            className="logo-lockup flex shrink-0 items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Logo
              animate="load"
              className={cn(
                "w-auto transition-[height] duration-300",
                condensed ? "h-9" : "h-11"
              )}
            />
          </Link>

          {/* ---- Desktop navigation ---- */}
          <div className="hidden items-center gap-0.5 xl:flex">
            {headerNav.map((item) =>
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

          {/* ---- Calls to action ---- */}
          <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
            {navCtas.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className={cn(
                  "btn-sm",
                  cta.style === "primary" ? "btn-primary" : "btn-outline"
                )}
              >
                {cta.label}
              </Link>
            ))}
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
function NavGroup({
  item,
  open,
  active,
  onOpen,
  onClose,
}: {
  item: HeaderNavItem;
  open: boolean;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <Link
        href={item.href}
        aria-expanded={open}
        onFocus={onOpen}
        onClick={onClose}
        className={cn("nav-link flex items-center gap-1", active && "nav-link-active")}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-ink-muted transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
        <span aria-hidden className={cn("nav-underline", active && "nav-underline-on")} />
      </Link>

      <div
        className={cn(
          "absolute left-0 top-full w-[22rem] overflow-hidden rounded-tile border border-line bg-white transition-opacity duration-150",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        hidden={!open}
      >
        <ul className="p-2">
          {item.children?.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onClose}
                className="block rounded-[0.5rem] px-3 py-2.5 transition-colors hover:bg-sand"
              >
                <span className="block text-meta font-semibold text-ink">{child.label}</span>
                <span className="mt-0.5 block text-caption text-ink-muted">{child.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
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
      <div className="border-b border-line bg-white">
        <div className="container-x grid gap-10 py-9 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="eyebrow">Shop by category</p>

            <div className="mt-6 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => {
                const count = c.count;
                return (
                  <Link
                    key={c.slug}
                    href={`/products/${c.slug}`}
                    onClick={onNavigate}
                    className="group/item flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {/* The category's own artwork, or its first product's
                        packshot. `aria-hidden` and empty alt: the name sits
                        beside it, so announcing the picture as well would read
                        every row twice. Categories with no products have no
                        thumbnail and keep the rule instead. */}
                    {c.thumb ? (
                      <span
                        aria-hidden
                        className={cn(
                          "relative size-10 shrink-0 overflow-hidden rounded-[0.5rem] border border-line",
                          c.thumb.fit === "contain" ? "bg-navy" : "bg-sand"
                        )}
                      >
                        <Image
                          src={c.thumb.src}
                          alt=""
                          fill
                          sizes="40px"
                          className={
                            c.thumb.fit === "contain"
                              ? "object-contain p-1"
                              : "object-cover"
                          }
                        />
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className="h-8 w-px shrink-0 bg-line transition-colors group-hover/item:bg-brand-500"
                      />
                    )}
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

            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-5">
              <Link href="/products" className="link-arrow text-meta">
                View the full formulary
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <p className="fine-print">
                All formulations require a valid prescription from a licensed provider.
              </p>
            </div>
          </div>

          {/* Featured panel. Gives the menu a visual anchor and points at the
              action a prescriber is actually here to take.

              The square carries the hero's own product shot: it is MediCraft's
              catalogue wearing MediCraft's labels, so unlike a stock dispensary
              shelf it makes no claim about a room. `object-contain` because the
              cut-out has no background of its own — the plate's gradient is
              what it stands on.

              The copy is absolutely positioned over the square rather than
              stacked under it, so the panel stays the height of one image
              instead of image-plus-text. The scrim is what keeps the copy
              legible where it crosses the vials. */}
          <div className="gradient-plate relative hidden aspect-square self-start lg:block">
            <span aria-hidden className="gradient-plate-grid" />

            <Image
              src={media.homeHero.src}
              alt={media.homeHero.alt}
              fill
              sizes="22rem"
              className="object-contain px-16 pt-12 pb-36"
            />

            <div className="absolute inset-x-0 bottom-0 z-10 p-6 pt-16 bg-gradient-to-t from-navy via-navy/85 to-transparent">
              <p className="panel-badge mb-3">Provider accounts</p>
              <p className="text-[1.0625rem] font-bold leading-snug text-white text-balance">
                Request the current formulary for your specialty
              </p>
              <p className="mt-2 text-caption text-white/70">
                A pharmacy liaison responds within one business day.
              </p>
              <Link href="/contact" className="btn-accent btn-sm mt-5 self-start">
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
