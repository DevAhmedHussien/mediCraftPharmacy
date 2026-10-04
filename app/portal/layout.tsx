import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { PortalNav } from "@/components/portal/PortalNav";
import { Logo } from "@/components/brand/Logo";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { visiblePortalLinks } from "@/lib/portal/nav";
import { progressStep, type PartnerStatus } from "@/lib/partner/status";
import { listNotifications } from "@/lib/services/notifications";

export const metadata: Metadata = {
  title: { default: "Portal", template: "%s · MediCraft Portal" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The partner's console.
 *
 * WHY THIS IS A LAYOUT AND NOT A PAGE WRAPPER
 * -------------------------------------------
 * The portal used to live under `app/(site)`, so every screen a signed-in
 * partner saw arrived wrapped in the marketing chrome: the public navbar with
 * "Open an Account", the footer sitemap, the contact band, the cookie banner.
 * A partner who had been a customer for a year was still being sold to, and
 * the one thing a console needs — a persistent way to move between sections —
 * was the one thing missing. Moving the directory to `app/portal` took it out
 * of that layout; the URLs did not change, because `(site)` was a route group.
 *
 * It is deliberately the same shell as `app/admin/layout.tsx`: same rail, same
 * top bar, same `--admin-*` surface, same `AdminUserMenu`. One console seen
 * from two sides.
 *
 * WHY THE GUARD IS HERE
 * ---------------------
 * `requirePartnerPage` runs once for the whole subtree rather than in each
 * page. The pages still guard their own data — ownership is checked per query,
 * never by position in the tree — but nothing under /portal can render for a
 * signed-out visitor or for an admin who wandered in.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: { companyName: true, status: true, application: { select: { practiceName: true } } },
  });

  // No application on this account: the portal has nothing to frame.
  if (!partner) redirect("/work-with-us");

  const notifications = await listNotifications(session.user.id);
  const status = partner.status as PartnerStatus;
  const accountName = partner.application?.practiceName ?? partner.companyName;

  const name = session.user.name ?? session.user.email ?? "Partner";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="admin flex min-h-dvh">
      {/* The first tab stop on every portal screen — the rail comes
          before the content, and nobody should have to tab past it to
          reach their own account. Visually hidden until focused. */}
      <a href="#portal-main" className="skip-link">
        Skip to your account
      </a>
      <aside
        className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r p-3 lg:flex"
        style={{ background: "var(--admin-rail)", borderColor: "var(--admin-border)" }}
      >
        <div className="flex items-center gap-2 px-2 pb-5 pt-1">
          <Link href="/portal" aria-label="MediCraft portal">
            <Logo className="h-6 w-auto" animate="none" />
          </Link>
          <span className="rounded bg-[#e8eefe] px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wider text-[color:var(--admin-accent)]">
            Partner
          </span>
        </div>

        <PortalNav status={status} />

        {/* The practice, pinned to the foot of the rail. An account manager
            working two practices from one browser needs to see which one is
            open without reading the data. */}
        <div className="mt-auto border-t pt-3" style={{ borderColor: "var(--admin-border)" }}>
          <p className="px-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-ink-50)]">
            Account
          </p>
          <p className="truncate px-2 pt-1 text-[0.8125rem] font-medium text-[color:var(--admin-ink)]">
            {accountName}
          </p>
          <p className="px-2 text-[0.6875rem] text-[color:var(--admin-ink-50)]">
            {progressStep(status)}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-12 shrink-0 items-center gap-4 border-b px-4"
          style={{ background: "var(--admin-rail)", borderColor: "var(--admin-border)" }}
        >
          <Link href="/portal" className="lg:hidden" aria-label="MediCraft portal">
            <Logo className="h-5 w-auto" animate="none" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell items={notifications.items} unread={notifications.unread} />
            <AdminUserMenu
              name={name}
              email={session.user.email ?? ""}
              initials={initials}
              roleLabel={accountName}
            />
          </div>
        </header>

        {/* The rail is desktop-only; below `lg` the sections sit here. Built
            from the same gated list, so a partner is never offered a tab on a
            phone that the rail would have hidden on a laptop. */}
        <div
          className="border-b bg-[color:var(--admin-surface)] px-4 py-2 lg:hidden"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {visiblePortalLinks(status).map((item) => (
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

        <main id="portal-main" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-[72rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
