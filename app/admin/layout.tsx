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
    <div className="admin flex min-h-dvh">
      {/* The first tab stop on every admin screen.
          The rail carries a dozen links before the table a keyboard
          user actually came for; without this they tab through all of
          them on every page. Visually hidden until focused. */}
      <a href="#admin-main" className="skip-link">
        Skip to the console
      </a>

      {/* Fixed and independently scrollable, so queue counts stay in view
          while working a long table. */}
      <aside
        className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r p-3 lg:flex"
        style={{ background: "var(--admin-rail)", borderColor: "var(--admin-border)" }}
      >
        <div className="flex items-center gap-2 px-2 pb-5 pt-1">
          <Link href="/admin" aria-label="MediCraft admin">
            <Logo className="h-6 w-auto" animate="none" />
          </Link>
          <span className="rounded bg-[theme(colors.info.bg)] px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wider text-[color:var(--admin-accent)]">
            Admin
          </span>
        </div>

        <AdminNav
          waiting={waiting}
          role={session.user.role}
          permissions={session.user.permissions}
        />

      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-12 shrink-0 items-center gap-4 border-b px-4"
          style={{ background: "var(--admin-rail)", borderColor: "var(--admin-border)" }}
        >
          <Link href="/admin" className="lg:hidden" aria-label="MediCraft admin">
            <Logo className="h-5 w-auto" animate="none" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell items={notifications.items} unread={notifications.unread} />
            {/* Name, role and sign out. In the bar rather than the foot of the
                rail, so it is present on a phone too — the rail is not. */}
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
        <div
          className="border-b bg-[color:var(--admin-surface)] px-4 py-2 lg:hidden"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {visibleAdminLinks(session.user.role, session.user.permissions).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] text-[color:var(--admin-ink-70)] transition-colors hover:bg-black/[0.04]"
              >
                <item.icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-[86rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
