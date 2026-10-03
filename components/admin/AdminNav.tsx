"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { BarChart3, FileText, FolderTree, Inbox, Package, ScrollText, Users } from "lucide-react";

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
const GROUPS: Array<{
  heading: string;
  items: Array<{
    href: string;
    label: string;
    icon: typeof Package;
    exact?: boolean;
    permission?: Permission;
    badge?: boolean;
  }>;
}> = [
  {
    heading: "Work",
    items: [
      { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
      {
        href: "/admin/partners",
        label: "Partners",
        icon: Users,
        permission: "partners.view",
        badge: true,
      },
    ],
  },
  {
    heading: "Website",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
      { href: "/admin/blog", label: "Articles", icon: FileText },
    ],
  },
  {
    heading: "System",
    items: [{ href: "/admin/audit", label: "Audit log", icon: ScrollText }],
  },
];

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
      {GROUPS.map((group) => {
        const visible = group.items.filter(
          (item) => !item.permission || isSuper || permissions.includes(item.permission)
        );
        if (visible.length === 0) return null;

        return (
          <div key={group.heading}>
            <p className="px-3 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white/35">
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
                            "shrink-0 rounded-[4px] px-1.5 py-px text-[0.6875rem] font-semibold tabular-nums",
                            "bg-[#f8e9e5] text-[#9c3a2a]"
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
