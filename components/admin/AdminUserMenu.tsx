"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Who you are signed in as, in the top bar.

   This lived at the foot of the left rail, which put the single most important
   piece of "am I in the right account" information below the fold on a short
   window, hid it entirely on anything narrower than `lg` — where the rail is
   not rendered at all — and spent three lines of permanent rail height on
   something a person looks at twice a day.

   In the top bar it is present on every screen size, and the name and role
   stay visible while only Sign out is behind a click.

   SIGN OUT IS A FORM, NOT A LINK
   ------------------------------
   `<Link href="/api/auth/signout">` was a GET, which anything that prefetches
   or crawls links can trigger — including Next's own router. It is a server
   action now; see lib/actions/auth.ts.
   ========================================================================= */

export function AdminUserMenu({
  name,
  email,
  initials,
  roleLabel,
}: {
  name: string;
  email: string;
  initials: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors",
          "hover:bg-[color:var(--admin-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-accent)]",
          open && "bg-[color:var(--admin-bg)]"
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[theme(colors.info.bg)] text-[0.6875rem] font-semibold text-[color:var(--admin-accent)]">
          {initials}
        </span>

        {/* The name and role ride in the bar itself on a wide window; on a
            phone the avatar alone carries it and the name is in the panel. */}
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[12rem] truncate text-[0.8125rem] font-medium leading-tight text-[color:var(--admin-ink)]">
            {name}
          </span>
          <span className="block text-[0.6875rem] leading-tight text-[color:var(--admin-ink-50)]">
            {roleLabel}
          </span>
        </span>

        <ChevronDown
          aria-hidden
          strokeWidth={2}
          className={cn(
            "size-3.5 shrink-0 text-[color:var(--admin-ink-50)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-60 overflow-hidden rounded-tile border bg-white shadow-lift"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--admin-border)" }}>
            <p className="truncate text-[0.8125rem] font-semibold text-[color:var(--admin-ink)]">
              {name}
            </p>
            {/* The address is the thing that actually disambiguates two
                accounts with the same display name. */}
            <p className="truncate font-mono text-[0.6875rem] text-[color:var(--admin-ink-50)]">
              {email}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-[theme(colors.info.bg)] px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wider text-[color:var(--admin-accent)]">
              <UserRound className="size-3" strokeWidth={2.2} aria-hidden />
              {roleLabel}
            </p>
          </div>

          <div className="p-1.5">
            <Link
              href="/"
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.8125rem] text-[color:var(--admin-ink-70)] transition-colors hover:bg-[color:var(--admin-bg)] hover:text-[color:var(--admin-ink)]"
            >
              View site
            </Link>

            {/* POST, so a prefetch cannot sign anybody out. */}
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[0.8125rem] text-[color:var(--admin-ink-70)] transition-colors hover:bg-[color:var(--admin-bg)] hover:text-[color:var(--admin-ink)]"
              >
                <LogOut className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
