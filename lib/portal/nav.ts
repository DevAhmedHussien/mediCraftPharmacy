import {
  ClipboardList,
  FileSignature,
  FolderOpen,
  LayoutDashboard,
  Pill,
  Receipt,
  Building2,
} from "lucide-react";

import { canAccess, type StepId } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/* ===========================================================================
   The partner's sections.

   Built the same way as lib/admin/nav.ts, and for the same reason: the rail is
   a client component (it reads `usePathname`) while the layout rendering it is
   a server component, and a server component cannot call a function exported
   from a `"use client"` module. Keeping the data in a module with no directive
   lets both import it for what it is.

   WHY SECTIONS ARE GATED AND NOT MERELY ORDERED
   ---------------------------------------------
   A partner halfway through onboarding has no agreement to read and no prices
   to look at. Showing those tabs would offer screens that redirect straight
   back, which reads as the product being broken rather than as the step not
   being reached yet. `canAccess` already decides this for the step tracker, so
   the rail asks the same question rather than inventing a second rule.

   Hiding a tab is a courtesy, not a control: every route re-checks server-side.
   ========================================================================= */

export type PortalNavItem = {
  href: string;
  label: string;
  icon: typeof Pill;
  /** `/portal` would otherwise match every child route. */
  exact?: boolean;
  /** The step that must be reachable for this to appear. */
  requires?: StepId;
  /** Only once the partner is fully verified. */
  verifiedOnly?: boolean;
};

export const PORTAL_NAV_GROUPS: Array<{
  heading: string;
  items: PortalNavItem[];
}> = [
  {
    heading: "Your account",
    items: [
      { href: "/portal", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/portal/application", label: "Application", icon: ClipboardList },
    ],
  },
  {
    heading: "Formulary",
    items: [
      { href: "/portal/pricing", label: "Your prices", icon: Receipt, requires: "pricing" },
      { href: "/portal/products", label: "Medications", icon: Pill, verifiedOnly: true },
    ],
  },
  {
    heading: "Paperwork",
    items: [
      { href: "/portal/onboarding", label: "Account details", icon: Building2, requires: "onboarding" },
      { href: "/portal/documents", label: "Documents", icon: FolderOpen, requires: "documents" },
      { href: "/portal/agreement", label: "Agreement", icon: FileSignature, requires: "agreement" },
    ],
  },
];

/** The sections this partner can reach at their current status, flattened. */
export function visiblePortalLinks(status: PartnerStatus): PortalNavItem[] {
  return PORTAL_NAV_GROUPS.flatMap((group) => group.items).filter((item) => {
    if (item.verifiedOnly) return status === PARTNER_STATUS.VERIFIED;
    if (item.requires) return canAccess(status, item.requires);
    return true;
  });
}
