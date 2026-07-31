import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BagIcon, WindowIcon } from "@/components/icons";
import { NavDrawer } from "@/components/nav/NavDrawer";
import { nav, navCtas, site } from "@/lib/site";
import { categories, productsByCategory } from "@/lib/data";

/**
 * Apple's global bar: 48px tall, 12px labels in regular weight, permanently
 * translucent over a heavy blur. Because it never swaps between transparent
 * and solid there is no scroll listener, so this is a server component — only
 * the mobile drawer ships JavaScript.
 */
export function Navbar() {
  return (
    <header className="chrome fixed inset-x-0 top-0 z-50 border-b border-line/60">
      <nav className="container-x flex h-12 items-center justify-between gap-6">
        <Link
          href="/"
          aria-label={`${site.name} — home`}
          className="flex shrink-0 items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {/* The mark runs a touch larger on small screens, where it is the only
              piece of brand on the bar and has the room to hold its own. */}
          <Logo
            markClassName="h-[1.75rem] w-[1.75rem] lg:h-6 lg:w-6"
            wordmarkClassName="text-[0.9375rem]"
          />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {/*
           * Products menu. The panel lives in the DOM and is revealed purely
           * with CSS on hover/focus-within — no state, no JavaScript, and every
           * category link ships in the server-rendered HTML.
           */}
          <div className="group static">
            <Link
              href="/products"
              className="flex h-12 items-center text-caption text-ink/90 transition-opacity duration-200 hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Products
            </Link>

            {/* Full-bleed panel, anchored under the bar the way Apple's is. */}
            <div className="invisible fixed inset-x-0 top-12 opacity-0 transition-[opacity,visibility] duration-300 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="chrome border-b border-line/60 shadow-sm">
                <div className="container-x py-10">
                  <p className="text-caption font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    Shop by category
                  </p>

                  <div className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/products/${c.slug}`}
                        className="group/item flex items-baseline gap-2 text-[1.3125rem] font-semibold tracking-[-0.021em] text-ink transition-colors duration-200 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {c.name}
                        <span className="text-caption font-normal text-ink-muted">
                          {productsByCategory(c.slug).length}
                        </span>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href="/products"
                    className="link-blue mt-8 inline-flex items-center text-body"
                  >
                    <BagIcon className="h-4 w-4" />
                    View the full catalog <span aria-hidden>›</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {nav
            .filter((item) => item.href !== "/products")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-caption text-ink/90 transition-opacity duration-200 hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {item.label}
              </Link>
            ))}
        </div>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {navCtas.map((cta) =>
            cta.external ? (
              <a
                key={cta.href}
                href={cta.href}
                className="inline-flex items-center gap-1 text-caption text-ink/90 transition-opacity duration-200 hover:opacity-60"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* Login opens the external provider portal. */}
                <WindowIcon className="h-3.5 w-3.5" />
                {cta.label}
              </a>
            ) : (
              <Link
                key={cta.href}
                href={cta.href}
                className={
                  cta.style === "primary"
                    ? "btn-primary btn-sm"
                    : "text-caption text-ink/90 transition-opacity duration-200 hover:opacity-60"
                }
              >
                {cta.label}
              </Link>
            )
          )}
        </div>

        <NavDrawer />
      </nav>
    </header>
  );
}
