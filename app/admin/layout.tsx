import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationBell } from "@/components/NotificationBell";
import { Logo } from "@/components/brand/Logo";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/guard";
import { ADMIN_ACTIONABLE_STATUSES } from "@/lib/partner/status";
import { listNotifications } from "@/lib/services/notifications";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · MediCraft Admin" },
  robots: { index: false, follow: false },
};

/**
 * Every /admin route is gated here.
 *
 * The middleware already bounced anyone without a session cookie, but that is
 * a performance shortcut, not the check — a cookie proves nothing about a
 * role. `requireAdminPage` sends a PARTNER to their own portal rather than
 * throwing; a layout that throws renders a stack trace at someone who merely
 * opened the wrong URL.
 *
 * The shell is the Tila console layout: a dark rail that is always present
 * because an operator moves between queues constantly, and a light working
 * panel beside it so the working area is unambiguous.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage();

  // The rail badge and the bell. Both are queried once per render, so the
  // number of partners waiting on us is visible from every screen and the
  // notification count can never disagree with the list behind it.
  const [waiting, notifications] = await Promise.all([
    db.partner.count({ where: { status: { in: ADMIN_ACTIONABLE_STATUSES as never } } }),
    listNotifications(session.user.id),
  ]);

  const name = session.user.name ?? session.user.email ?? "Admin";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="admin flex min-h-dvh">
      {/* Fixed and independently scrollable, so queue counts stay in view
          while working a long table. */}
      <aside
        className="hidden w-56 shrink-0 flex-col overflow-y-auto p-3 lg:flex"
        style={{ background: "var(--admin-rail)" }}
      >
        <div className="flex items-center gap-2 px-2 pb-5 pt-1">
          <Link href="/admin" aria-label="MediCraft admin">
            <Logo className="h-6 w-auto" tone="invert" animate="none" />
          </Link>
          <span className="rounded-[4px] bg-white/15 px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wider text-white/75">
            Admin
          </span>
        </div>

        <AdminNav
          waiting={waiting}
          role={session.user.role}
          permissions={session.user.permissions}
        />

        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="flex items-center gap-2.5 px-2 pb-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[0.6875rem] font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] text-white">{name}</span>
              <span className="block text-[0.6875rem] text-white/45">
                {session.user.role === "SUPER_ADMIN" ? "Super admin" : "Administrator"}
              </span>
            </span>
          </div>
          <Link
            href="/api/auth/signout"
            className="block rounded-[5px] px-2 py-1.5 text-[0.8125rem] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Sign out
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-12 shrink-0 items-center gap-4 px-4"
          style={{ background: "var(--admin-rail)" }}
        >
          <Link href="/admin" className="lg:hidden" aria-label="MediCraft admin">
            <Logo className="h-5 w-auto" tone="invert" animate="none" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell items={notifications.items} unread={notifications.unread} tone="dark" />
          </div>
          <Link
            href="/"
            className="shrink-0 text-[0.8125rem] text-white/55 transition-colors hover:text-white"
          >
            View site
          </Link>
        </header>

        {/* The rail is desktop-only; on a tablet the sections sit here. */}
        <div
          className="border-b bg-[color:var(--admin-surface)] px-4 py-2 lg:hidden"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {[
              ["/admin", "Overview"],
              ["/admin/partners", "Partners"],
              ["/admin/products", "Products"],
              ["/admin/blog", "Blog"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-[5px] px-2.5 py-1.5 text-[0.8125rem] text-[color:var(--admin-ink-70)] transition-colors hover:bg-black/[0.04]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <main id="admin-main" className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-[86rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
