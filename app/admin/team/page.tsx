import { redirect } from "next/navigation";

import { AdminRow } from "@/components/admin/AdminRow";
import { CreateAdminForm } from "@/components/admin/CreateAdminForm";
import { PageHeader, Panel, StatStrip } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/guard";
import {
  ALL_PERMISSIONS,
  PERMISSION_BLURB,
  listAdmins,
} from "@/lib/services/admins";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

/* ===========================================================================
   Who can get in, what they can do, and what they have done.

   SUPER ADMIN ONLY, and not by a permission. Creating accounts and moving
   grants is the one capability that can grant itself everything else, so
   gating it on a permission would mean a permission that quietly contains all
   the others. The role is the gate.

   The redirect rather than a 403 page is the pattern the rest of /admin uses:
   an admin who cannot reach a section is sent to the overview rather than
   shown a wall. The nav hides the link for them too, but that is a courtesy —
   this check is the control.
   ========================================================================= */

export default async function AdminTeamPage() {
  // `requireAdminPage` first, so a signed-out visitor gets the login redirect
  // with a sensible callback rather than being bounced to /admin and then out.
  const session = await requireAdminPage("/admin/team");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin");

  const admins = await listAdmins();

  const options = ALL_PERMISSIONS.map((permission) => ({
    value: permission,
    // The dotted name is what the audit log and the grant chips show, so the
    // label is the same string rather than a prettified second vocabulary.
    label: permission,
    blurb: PERMISSION_BLURB[permission],
  }));

  const active = admins.filter((a) => a.isActive);
  const agreements = admins.reduce((sum, a) => sum + a.work.agreementsSent, 0);
  const verified = admins.reduce((sum, a) => sum + a.work.partnersVerified, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team"
        description="Staff accounts, their permissions, and the work each of them has signed off."
      />

      <StatStrip
        stats={[
          { label: "Active accounts", value: String(active.length) },
          { label: "Switched off", value: String(admins.length - active.length) },
          { label: "Agreements sent", value: String(agreements) },
          { label: "Partners verified", value: String(verified) },
        ]}
      />

      <CreateAdminForm permissions={options} />

      <Panel
        title="Everyone with a login"
        description="Counts are read from the trail each person left — the transitions they drove, the change orders they picked up, the price lists they built. Nobody is 'assigned' an account in this system."
      >
        <div className="space-y-3">
          {admins.map((admin) => (
            <AdminRow
              key={admin.id}
              isSelf={admin.id === session.user.id}
              permissionOptions={options}
              admin={{
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role as "ADMIN" | "SUPER_ADMIN",
                isActive: admin.isActive,
                lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
                permissions: admin.permissions,
                work: admin.work,
              }}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
