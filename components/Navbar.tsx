"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/set";
import { NavDrawer } from "@/components/nav/NavDrawer";
import { headerNav, navCtas, site, topbar } from "@/lib/site";
import { categories, productsByCategory } from "@/lib/data";
import { media } from "@/lib/media";
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
export function Navbar() {
  const pathname = usePathname();
  const [condensed, setCondensed] = useState(false);

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
              href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
              className="flex items-center gap-1.5 font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={1.8} />
              {site.phone}
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
            <a
              href={site.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              Provider Portal Login
            </a>
          </div>
        </div>
      </div>

      {/* ---- Main bar ---- */}
      <div
        className={cn(
          "chrome border-b transition-[box-shadow,border-color] duration-300",
          condensed ? "border-line shadow-bar" : "border-line/70"
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
            {headerNav.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(item.href)}
              />
            ))}

            {/* Products, with a full-bleed mega-panel. */}
            <div className="group static">
              <Link
                href="/products"
                className={cn("nav-link flex items-center gap-1", productsActive && "nav-link-active")}
              >
                Products
                <ChevronDown
                  className="h-3.5 w-3.5 text-ink-muted transition-transform duration-200 group-hover:rotate-180"
                  strokeWidth={2}
                />
                <span
                  aria-hidden
                  className={cn("nav-underline", productsActive && "nav-underline-on")}
                />
              </Link>

              <MegaPanel />
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

          <NavDrawer />
        </nav>
      </div>
    </header>
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
function MegaPanel() {
  return (
    <div className="invisible absolute inset-x-0 top-full opacity-0 transition-[opacity,visibility] duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      <div className="border-b border-line bg-white shadow-lift">
        <div className="container-x grid gap-10 py-9 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="eyebrow">Shop by category</p>

            <div className="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => {
                const count = productsByCategory(c.slug).length;
                return (
                  <Link
                    key={c.slug}
                    href={`/products/${c.slug}`}
                    className="group/item flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.55rem] bg-brand-500/10 text-brand-600 transition-colors group-hover/item:bg-brand-500 group-hover/item:text-white">
                      <Icon name={c.icon} className="h-4 w-4" />
                    </span>
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
              action a prescriber is actually here to take. */}
          <div className="relative hidden overflow-hidden rounded-panel lg:block">
            <Image
              src={media.dispensary.src}
              alt=""
              fill
              sizes="380px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/25" />
            <div className="relative flex h-full flex-col justify-end p-6">
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
