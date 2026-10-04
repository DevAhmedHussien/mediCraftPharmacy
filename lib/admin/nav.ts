import type { Role } from "@prisma/client";
import {
  BarChart3,
  FileText,
  FolderTree,
  Inbox,
  Package,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { Permission } from "@/lib/partner/status";

/* ===========================================================================
   The admin's sections, in one place.

   WHY THIS IS NOT IN AdminNav.tsx
   -------------------------------
   The rail is a client component (it reads `usePathname` to mark the active
   link). The layout that renders it is a server component, and it needs the
   same list for the horizontal strip it shows below `lg`, where the rail is
   hidden.

   A server component cannot call a plain function exported from a `"use
   client"` module: across that boundary every export becomes a client
   reference, so the import succeeds, the types check, and the call throws
   `is not a function` at request time. Nothing catches it earlier — these
   routes are `force-dynamic`, so they are never rendered during the build.

   Keeping the data here, in a module with no directive, lets both sides
   import it for what it is.

   Hiding a link is a courtesy, not a control: every route re-checks its
   permission server-side, so typing the URL gets a redirect, not access.
   ========================================================================= */

export type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof Package;
  /** `/admin` would otherwise match every child route. */
  exact?: boolean;
  permission?: Permission;
  /** Carries the "waiting on us" count. */
  badge?: boolean;
  /**
   * Super admins only, regardless of permissions.
   *
   * Team management can grant every permission there is, so it cannot itself
   * be behind one — a `team.manage` permission would be a permission that
   * contains all the others. The route re-checks the role; this only decides
   * whether the link is drawn.
   */
  superAdminOnly?: boolean;
};

export const ADMIN_NAV_GROUPS: Array<{
  heading: string;
  items: AdminNavItem[];
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
      { href: "/admin/traffic", label: "Traffic", icon: BarChart3 },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
      { href: "/admin/blog", label: "Articles", icon: FileText },
    ],
  },
  {
    heading: "System",
    items: [
      {
        href: "/admin/team",
        label: "Team",
        icon: ShieldCheck,
        superAdminOnly: true,
      },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
    ],
  },
];

/** The items this operator can reach, flattened and in rail order. */
export function visibleAdminLinks(
  role: Role,
  permissions: Permission[]
): AdminNavItem[] {
  const isSuper = role === "SUPER_ADMIN";
  return ADMIN_NAV_GROUPS.flatMap((group) => group.items).filter((item) => {
    if (item.superAdminOnly) return isSuper;
    return !item.permission || isSuper || permissions.includes(item.permission);
  });
}
