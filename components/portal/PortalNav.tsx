"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PORTAL_NAV_GROUPS } from "@/lib/portal/nav";
import { canAccess } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/**
 * The partner's rail.
 *
 * Deliberately the same component shape, the same `.admin-rail-link` class and
 * the same grouping as the admin's — so the two consoles are one piece of
 * furniture seen from two sides, rather than two things that resemble each
 * other.
 *
 * Sections the partner has not reached yet are not rendered. See the note in
 * lib/portal/nav.ts about why that is a gate and not just an ordering.
 */
export function PortalNav({ status }: { status: PartnerStatus }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Your account" className="flex flex-col gap-4">
      {PORTAL_NAV_GROUPS.map((group) => {
        const visible = group.items.filter((item) => {
          if (item.verifiedOnly) return status === PARTNER_STATUS.VERIFIED;
          if (item.requires) return canAccess(status, item.requires);
          return true;
        });
        if (visible.length === 0) return null;

        return (
          <div key={group.heading} className="flex flex-col gap-0.5">
            {/* Mono, not a bolded sans — the reference sets every structural
                micro-label in the mono register, which is what tells a group
                heading apart from a nav item at the same size. */}
            <p className="px-2.5 pb-1.5 font-mono text-[0.65625rem] uppercase tracking-eyebrow text-[color:var(--admin-ink-50)]">
              {group.heading}
            </p>
            <ul className="flex flex-col gap-0.5">
              {visible.map((item) => {
                // `/portal` would otherwise match every child route.
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="admin-rail-link"
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
