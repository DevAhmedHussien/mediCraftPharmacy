"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { ADMIN_NAV_GROUPS } from "@/lib/admin/nav";
import type { Permission } from "@/lib/partner/status";
import { cn } from "@/lib/utils";

/**
 * A dark rail, always there.
 *
 * The public site hides its navigation on a phone because a visitor sees four
 * pages. An operator moves between queues constantly, so the rail is
 * persistent and dense — and dark, so the working area is unambiguously the
 * light panel beside it.
 *
 * Hiding a link is a courtesy, not a control: every route re-checks its
 * permission server-side, so typing the URL gets a redirect, not access.
 */
export function AdminNav({
  waiting,
  role,
  permissions,
}: {
  waiting: number;
  role: Role;
  permissions: Permission[];
}) {
  const pathname = usePathname();
  const isSuper = role === "SUPER_ADMIN";

  return (
    <nav aria-label="Admin" className="space-y-5">
      {ADMIN_NAV_GROUPS.map((group) => {
        const visible = group.items.filter((item) => {
          // Team management cannot sit behind a permission — see the note on
          // `superAdminOnly` in lib/admin/nav.ts.
          if (item.superAdminOnly) return isSuper;
          return !item.permission || isSuper || permissions.includes(item.permission);
        });
        if (visible.length === 0) return null;

        return (
          <div key={group.heading}>
            <p className="px-3 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-ink-50)]">
              {group.heading}
            </p>
            <ul className="space-y-px">
              {visible.map((item) => {
                // `/admin` would otherwise match every child route.
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
                      {item.badge && waiting > 0 && (
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-px text-[0.6875rem] font-semibold tabular-nums",
                            "bg-[#f8e9e5] text-[theme(colors.danger.fg)]"
                          )}
                        >
                          {waiting}
                        </span>
                      )}
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
