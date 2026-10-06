import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import { visibleAdminLinks } from "@/lib/admin/nav";
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
    <div className="admin min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* The first tab stop on every admin screen.
          The rail carries a dozen links before the table a keyboard
          user actually came for; without this they tab through all of
          them on every page. Visually hidden until focused. */}
      <a href="#admin-main" className="skip-link">
        Skip to the console
      </a>

      {/* The same glass card the partner portal's rail is, in the same 16px
          gutter — the two consoles are one piece of furniture seen from two
          sides, and until this they were a floating card on one side and a
          bordered column on the other. Sticky and independently scrollable,
          so queue counts stay in view while working a long table. */}
      <aside className="sticky top-0 hidden h-dvh p-4 lg:block">
        <div className="flex h-full min-h-0 flex-col gap-[22px] overflow-y-auto rounded-card border border-white/90 bg-white/[0.62] px-3.5 py-5 shadow-glass backdrop-blur-xl">
          <div className="flex items-center gap-2 pl-2">
            <Link href="/admin" aria-label="MediCraft admin">
              <Logo className="h-7 w-auto" animate="none" />
            </Link>
            <span className="rounded-full bg-[theme(colors.info.bg)] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-eyebrow text-[color:var(--admin-accent)]">
              Admin
            </span>
          </div>

          <AdminNav
            waiting={waiting}
            role={session.user.role}
            permissions={session.user.permissions}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Below `lg` only — on a laptop the identity chip sits in the page
            header, where the reference puts it. A full-width bar there would
            re-draw the border the rail just stopped drawing. */}
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-hair-soft px-4 lg:hidden">
          <Link href="/admin" aria-label="MediCraft admin">
            <Logo className="h-5 w-auto" animate="none" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell items={notifications.items} unread={notifications.unread} />
            <AdminUserMenu
              name={name}
              email={session.user.email ?? ""}
              initials={initials}
              roleLabel={
                session.user.role === "SUPER_ADMIN" ? "Super admin" : "Administrator"
              }
            />
          </div>
        </header>

        {/* The rail is desktop-only; on a tablet the sections sit here. */}
        <div className="border-b border-hair-soft px-4 py-2 lg:hidden">
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {visibleAdminLinks(session.user.role, session.user.permissions).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-[0.625rem] px-2.5 py-1.5 text-[0.8125rem] text-[color:var(--admin-ink-70)] transition-colors hover:bg-black/[0.04] motion-reduce:transition-none"
              >
                <item.icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <main
          id="admin-main"
          tabIndex={-1}
          className="min-w-0 flex-1 p-4 md:p-6 lg:py-8 lg:pb-16 lg:pl-6 lg:pr-10"
        >
          {/* The desktop identity chip. Mirrors the mobile header above
              rather than duplicating it — only one of the two is ever in the
              accessibility tree at a given width. */}
          <div className="mb-5 hidden items-center justify-end gap-2 lg:flex">
            <NotificationBell items={notifications.items} unread={notifications.unread} />
            {/* Name, role and sign out. */}
            <AdminUserMenu
              name={name}
              email={session.user.email ?? ""}
              initials={initials}
              roleLabel={
                session.user.role === "SUPER_ADMIN" ? "Super admin" : "Administrator"
              }
            />
          </div>
          <div className="w-full max-w-[86rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
