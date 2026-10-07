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

  /* `260px | 1fr` at `lg`, one column below it — the reference's portal
     geometry. It was a 224px rail with a border down its right side; the
     redesign floats the rail as a glass card inside a 16px gutter instead,
     so there is no border to draw and the page ground runs behind it. */
  return (
    <div className="admin min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* The first tab stop on every portal screen — the rail comes
          before the content, and nobody should have to tab past it to
          reach their own account. Visually hidden until focused. */}
      <a href="#portal-main" className="skip-link">
        Skip to your account
      </a>
      <aside className="sticky top-0 hidden h-dvh p-4 lg:block">
        <div className="flex h-full min-h-0 flex-col gap-[22px] overflow-y-auto rounded-card border border-white/90 bg-white/[0.62] px-3.5 py-5 shadow-glass backdrop-blur-xl">
          <div className="flex items-center gap-2 pl-2">
            <Link href="/portal" aria-label="MediCraft portal">
              <Logo className="h-7 w-auto" animate="none" />
            </Link>
          </div>

          <PortalNav status={status} />

          {/* The practice, pinned to the foot of the rail. An account manager
              working two practices from one browser needs to see which one is
              open without reading the data. */}
          <div className="mt-auto flex flex-col gap-1 rounded-2xl border border-hair-soft bg-white/70 p-3.5">
            <p className="font-mono text-[0.65625rem] uppercase tracking-eyebrow text-[color:var(--admin-ink-50)]">
              Account
            </p>
            <p className="truncate text-[0.8125rem] font-medium text-[color:var(--admin-ink)]">
              {accountName}
            </p>
            <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
              {progressStep(status)}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Below `lg` only. On a laptop the identity chip lives in the page
            header beside the title, where the reference puts it; a second bar
            spanning the full width would re-draw the border the rail just
            stopped drawing. */}
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-hair-soft px-4 lg:hidden">
          <Link href="/portal" aria-label="MediCraft portal">
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
        <div className="border-b border-hair-soft px-4 py-2 lg:hidden">
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {visiblePortalLinks(status).map((item) => (
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

        {/* Asymmetric on purpose, as the reference has it: 24px on the rail
            side because the rail's own 16px gutter already stands the content
            off, 40px on the free side. */}
        <main
          id="portal-main"
          tabIndex={-1}
          className="min-w-0 flex-1 p-4 md:p-6 lg:max-w-[1180px] lg:pb-24 lg:pl-6 lg:pr-10 lg:pt-8"
        >
          {/* The desktop identity chip. Mirrors the mobile header above
              rather than duplicating it — only one of the two is ever in the
              accessibility tree at a given width. */}
          <div className="mb-5 hidden items-center justify-end gap-2 lg:flex">
            <NotificationBell items={notifications.items} unread={notifications.unread} />
            <AdminUserMenu
              name={name}
              email={session.user.email ?? ""}
              initials={initials}
              roleLabel={accountName}
            />
          </div>
          <div className="flex flex-col gap-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
