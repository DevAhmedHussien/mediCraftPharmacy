"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { BagIcon } from "@/components/icons";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { nav, navCtas, site } from "@/lib/site";
import { categories, getCategory, productsByCategory } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Multi-level mobile navigation drawer, in the pattern of the JoeyMed menu:
 * the panel pushes forward into Products -> a category -> that category's
 * products, with a back control at every level rather than nested accordions.
 */
type View =
  | { level: "root" }
  | { level: "categories" }
  | { level: "category"; slug: string };

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ level: "root" });
  // Drives the slide direction so going deeper and going back feel different.
  const [forward, setForward] = useState(true);

  const push = (next: View) => {
    setForward(true);
    setView(next);
  };
  const back = (next: View) => {
    setForward(false);
    setView(next);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    // Reset to the top level once the close animation has finished.
    if (!next) setTimeout(() => setView({ level: "root" }), 300);
  };

  const panelClass = cn(
    "flex flex-1 flex-col overflow-y-auto",
    forward
      ? "animate-in slide-in-from-right-6 fade-in duration-300"
      : "animate-in slide-in-from-left-6 fade-in duration-300"
  );

  const activeCategory =
    view.level === "category" ? getCategory(view.slug) : undefined;
  const categoryProducts =
    view.level === "category" ? productsByCategory(view.slug) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        className="grid h-10 w-10 place-items-center rounded-lg text-ink transition-colors hover:bg-brand-50 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        hideClose={false}
      >
        {/* Brand row. The visible logo is artwork, so the dialog's accessible
            name is carried by a screen-reader-only title alongside it. */}
        <div className="flex h-20 shrink-0 items-center border-b border-line px-6">
          <SheetClose asChild>
            <Link
              href="/"
              className="logo-lockup flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <Logo animate="none" className="h-10" />
            </Link>
          </SheetClose>
          <SheetTitle className="sr-only">{site.name} menu</SheetTitle>
        </div>

        {/* Level 1 — top-level navigation */}
        {view.level === "root" && (
          <div key="root" className={panelClass}>
            <nav className="flex flex-col p-4">
              <button
                type="button"
                onClick={() => push({ level: "categories" })}
                className="flex items-center justify-between rounded-xl px-3 py-3.5 text-left text-base font-semibold text-ink transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                Products
                <ChevronRight className="h-5 w-5 text-brand-500" />
              </button>

              {nav
                .filter((item) => item.href !== "/products")
                .map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-xl px-3 py-3.5 text-base font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
            </nav>

            <DrawerCtas />
          </div>
        )}

        {/* Level 2 — product categories */}
        {view.level === "categories" && (
          <div key="categories" className={panelClass}>
            <BackBar label="Menu" onClick={() => back({ level: "root" })} />

            <div className="px-6 pb-2">
              <p className="font-display text-lg font-semibold text-ink">Products</p>
              <p className="mt-1 text-sm text-ink-muted">
                {categories.length} therapeutic categories
              </p>
            </div>

            <nav className="flex flex-col p-4">
              <SheetClose asChild>
                <Link
                  href="/products"
                  className="mb-1 flex items-center gap-2.5 rounded-xl bg-brand-50 px-3 py-3.5 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  <BagIcon className="h-5 w-5" />
                  All Products
                </Link>
              </SheetClose>

              {categories.map((c) => {
                const count = productsByCategory(c.slug).length;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => push({ level: "category", slug: c.slug })}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-brand-50"
                  >
                    <span className="text-base font-medium text-ink-soft">{c.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-ink-muted">{count}</span>
                      <ChevronRight className="h-5 w-5 text-brand-500" />
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Level 3 — products inside a category */}
        {view.level === "category" && activeCategory && (
          <div key={view.slug} className={panelClass}>
            <BackBar
              label="Back to categories"
              onClick={() => back({ level: "categories" })}
            />

            <div className="px-6 pb-2">
              <p className="font-display text-lg font-semibold text-ink">
                {activeCategory.name}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{activeCategory.blurb}</p>
            </div>

            <nav className="flex flex-col p-4">
              <SheetClose asChild>
                <Link
                  href={`/products/${activeCategory.slug}`}
                  className="mb-1 rounded-xl bg-brand-50 px-3 py-3.5 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  View all {activeCategory.name}
                </Link>
              </SheetClose>

              {categoryProducts.map((p) => (
                <SheetClose asChild key={p.slug}>
                  <Link
                    href={`/product/${p.slug}`}
                    className="rounded-xl px-3 py-3 transition-colors hover:bg-brand-50"
                  >
                    <span className="block text-sm font-medium text-ink-soft">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {p.form} · {p.doses}
                    </span>
                  </Link>
                </SheetClose>
              ))}
            </nav>

            <DrawerCtas />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BackBar({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-6 py-4 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

function DrawerCtas() {
  return (
    <div className="mt-auto flex flex-col gap-2.5 border-t border-line p-6">
      {navCtas.map((cta) => (
        <SheetClose asChild key={cta.href}>
          <Link
            href={cta.href}
            className={cn(
              "w-full justify-center",
              cta.style === "primary" ? "btn-primary" : "btn-outline"
            )}
          >
            {cta.label}
          </Link>
        </SheetClose>
      ))}

      {/* The topbar's utility links are hidden on phones, so the drawer is
          where they have to live. */}
      <a
        href={site.loginUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-center text-meta font-medium text-brand-600 transition-colors hover:text-brand-500"
      >
        Provider Portal Login
      </a>
      <a
        href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
        className="text-center text-meta text-ink-soft transition-colors hover:text-ink"
      >
        {site.phone}
      </a>
    </div>
  );
}
