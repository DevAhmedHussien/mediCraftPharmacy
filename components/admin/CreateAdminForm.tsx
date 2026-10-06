"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";

import { createAdminAction } from "@/app/admin/team/actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import { Panel } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";

/* ===========================================================================
   Adding an operator.

   COLLAPSED UNTIL ASKED FOR. A super admin opens this page to look at the
   team far more often than to grow it, and a permanently-open form with a
   password box in it is the thing the eye lands on first.

   THE PASSWORD IS TYPED, NOT EMAILED. The success message says so in as many
   words, because the one way this goes wrong is a super admin creating an
   account and waiting for an invite that is never sent.
   ========================================================================= */

export function CreateAdminForm({
  permissions,
}: {
  permissions: { value: string; label: string; blurb: string }[];
}) {
  const [state, action] = useFormState(createAdminAction, initialFormState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Panel
        title="Add someone"
        description="Create a staff account with an email, a password and the permissions they need."
      >
        <button type="button" onClick={() => setOpen(true)} className="admin-btn admin-btn-primary">
          <UserPlus className="size-3.5" strokeWidth={2.2} aria-hidden />
          Add an admin
        </button>
      </Panel>
    );
  }

  return (
    <Panel
      title="Add someone"
      description="They can sign in the moment this is saved. Tell them the password yourself — nothing is emailed."
    >
      <form action={action} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-admin-name" className="admin-label mb-1 block">
              Name
            </label>
            <input
              id="new-admin-name"
              name="name"
              required
              autoComplete="off"
              className="admin-input"
              placeholder="Ayman Hassan"
            />
          </div>
          <div>
            <label htmlFor="new-admin-email" className="admin-label mb-1 block">
              Email
            </label>
            <input
              id="new-admin-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              className="admin-input"
              placeholder="ayman@medicraftpharmacy.com"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-admin-password" className="admin-label mb-1 block">
              Password
            </label>
            <input
              id="new-admin-password"
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className="admin-input"
            />
            <p className="mt-1 text-[0.75rem] text-[color:var(--admin-ink-50)]">
              At least 12 characters, with a number or a symbol.
            </p>
          </div>
          <div>
            <label htmlFor="new-admin-confirm" className="admin-label mb-1 block">
              Repeat it
            </label>
            <input
              id="new-admin-confirm"
              name="confirmPassword"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className="admin-input"
            />
            {state.errors?.confirmPassword && (
              <p role="alert" className="mt-1 text-[0.75rem] font-medium text-[theme(colors.danger.fg)]">
                {state.errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <fieldset>
          <legend className="admin-label mb-1">Role</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[0.8125rem]">
              <input type="radio" name="role" value="ADMIN" defaultChecked /> Admin
            </label>
            <label className="flex items-center gap-2 text-[0.8125rem]">
              <input type="radio" name="role" value="SUPER_ADMIN" /> Super admin
            </label>
          </div>
          <p className="mt-1 text-[0.75rem] text-[color:var(--admin-ink-50)]">
            A super admin bypasses every permission below, including this page.
          </p>
        </fieldset>

        <PermissionGrid name="permissions" permissions={permissions} granted={[]} />

        <div className="flex flex-wrap items-center gap-3">
          <Submit idle="Create the account" busy="Creating…" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[0.8125rem] underline text-[color:var(--admin-ink-50)]"
          >
            Cancel
          </button>
        </div>

        {state.message && <AdminAlert ok={state.ok}>{state.message}</AdminAlert>}
      </form>
    </Panel>
  );
}

/** The eight permissions as checkboxes, with what each one means. */
export function PermissionGrid({
  name,
  permissions,
  granted,
  idPrefix = "new",
}: {
  name: string;
  permissions: { value: string; label: string; blurb: string }[];
  granted: string[];
  idPrefix?: string;
}) {
  return (
    <fieldset>
      <legend className="admin-label mb-2">Permissions</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {permissions.map((permission) => (
          <label
            key={permission.value}
            htmlFor={`${idPrefix}-${permission.value}`}
            className="flex cursor-pointer items-start gap-2.5 rounded-[5px] border px-3 py-2.5"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <input
              id={`${idPrefix}-${permission.value}`}
              type="checkbox"
              name={name}
              value={permission.value}
              defaultChecked={granted.includes(permission.value)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[0.8125rem] font-semibold text-[color:var(--admin-ink)]">
                {permission.label}
              </span>
              <span className="block text-[0.75rem] text-[color:var(--admin-ink-50)]">
                {permission.blurb}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
      {pending ? busy : idle}
    </button>
  );
}
