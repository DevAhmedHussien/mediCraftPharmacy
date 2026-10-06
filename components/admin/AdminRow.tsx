"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, Power, ShieldCheck, SlidersHorizontal } from "lucide-react";

import {
  resetPasswordAction,
  setActiveAction,
  setPermissionsAction,
  setRoleAction,
} from "@/app/admin/team/actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import { PermissionGrid } from "@/components/admin/CreateAdminForm";
import { Pill } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";

/* ===========================================================================
   One operator, and what can be done to their account.

   The three edits are collapsed behind their own buttons rather than laid out
   together. A row that shows a permission grid, a password box and a
   deactivate button at once is a row where the dangerous action is one
   mis-click from the routine one — and the routine one here is "look at what
   they can do", which needs no form at all.

   THE COUNTS ARE THE POINT OF THE ROW. "How many agreements has this person
   sent" is the question this page gets opened for, and it is read off the
   transitions they drove rather than an owner field nobody maintains.
   ========================================================================= */

export type AdminRowView = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  lastLoginAt: string | null;
  permissions: string[];
  work: {
    agreementsSent: number;
    partnersVerified: number;
    changeOrders: number;
    priceLists: number;
  };
};

const when = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "never";

export function AdminRow({
  admin,
  isSelf,
  permissionOptions,
}: {
  admin: AdminRowView;
  /** The super admin looking at their own row. Some moves are refused. */
  isSelf: boolean;
  permissionOptions: { value: string; label: string; blurb: string }[];
}) {
  const [panel, setPanel] = useState<"permissions" | "password" | null>(null);

  const [permState, permAction] = useFormState(
    setPermissionsAction.bind(null, admin.id),
    initialFormState
  );
  const [pwdState, pwdAction] = useFormState(
    resetPasswordAction.bind(null, admin.id),
    initialFormState
  );
  const [activeState, activeAction] = useFormState(
    setActiveAction.bind(null, admin.id, !admin.isActive),
    initialFormState
  );
  const [roleState, roleAction] = useFormState(
    setRoleAction.bind(null, admin.id, admin.role === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN"),
    initialFormState
  );

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "var(--admin-border)",
        // A switched-off account stays legible but stops competing for
        // attention with the people who can actually sign in.
        opacity: admin.isActive ? 1 : 0.62,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.9375rem] font-bold text-[color:var(--admin-ink)]">
            {admin.name}
            {isSelf && (
              <span className="ml-2 text-[0.75rem] font-normal text-[color:var(--admin-ink-50)]">
                (you)
              </span>
            )}
          </p>
          <p className="text-[0.8125rem] text-[color:var(--admin-ink-70)]">{admin.email}</p>
          <p className="mt-0.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">
            Last signed in {when(admin.lastLoginAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={admin.role === "SUPER_ADMIN" ? "info" : "neutral"}>
            {admin.role === "SUPER_ADMIN" ? "super admin" : "admin"}
          </Pill>
          <Pill tone={admin.isActive ? "good" : "bad"}>
            {admin.isActive ? "active" : "switched off"}
          </Pill>
        </div>
      </div>

      {/* ---- What they have done ---- */}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Count label="Agreements sent" value={admin.work.agreementsSent} />
        <Count label="Partners verified" value={admin.work.partnersVerified} />
        <Count label="Change orders" value={admin.work.changeOrders} />
        <Count label="Price lists built" value={admin.work.priceLists} />
      </dl>

      {/* ---- What they may do ---- */}
      <div className="mt-4">
        <p className="admin-label mb-1.5">Permissions</p>
        {admin.role === "SUPER_ADMIN" ? (
          <p className="text-[0.8125rem] text-[color:var(--admin-ink-70)]">
            Everything. A super admin bypasses the permission check, so the grants below are
            what they would keep if they were demoted.
          </p>
        ) : admin.permissions.length === 0 ? (
          <p className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">
            None. They can sign in and see the overview, and nothing else.
          </p>
        ) : null}

        {admin.permissions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {admin.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded px-1.5 py-0.5 font-mono text-[0.6875rem]"
                style={{ background: "var(--admin-bg)", color: "var(--admin-ink-70)" }}
              >
                {permission}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---- Moves ---- */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "var(--admin-border)" }}>
        <button
          type="button"
          onClick={() => setPanel(panel === "permissions" ? null : "permissions")}
          aria-expanded={panel === "permissions"}
          className="admin-btn admin-btn-secondary"
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} aria-hidden />
          Change permissions
        </button>

        <button
          type="button"
          onClick={() => setPanel(panel === "password" ? null : "password")}
          aria-expanded={panel === "password"}
          className="admin-btn admin-btn-secondary"
        >
          <KeyRound className="size-3.5" strokeWidth={2} aria-hidden />
          Set a new password
        </button>

        <form action={roleAction}>
          <Submit
            idle={admin.role === "SUPER_ADMIN" ? "Demote to admin" : "Make super admin"}
            busy="Saving…"
            icon={<ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />}
            // Demoting yourself removes the only page that could undo it.
            disabled={isSelf && admin.role === "SUPER_ADMIN"}
          />
        </form>

        <form action={activeAction}>
          <Submit
            idle={admin.isActive ? "Switch off" : "Switch back on"}
            busy="Saving…"
            icon={<Power className="size-3.5" strokeWidth={2} aria-hidden />}
            danger={admin.isActive}
            disabled={isSelf && admin.isActive}
          />
        </form>
      </div>

      <Alerts states={[roleState, activeState]} />

      {panel === "permissions" && (
        <form action={permAction} className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
          <PermissionGrid
            name="permissions"
            permissions={permissionOptions}
            granted={admin.permissions}
            idPrefix={admin.id}
          />
          <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
            Saving replaces their grants with exactly what is ticked here.
          </p>
          <Submit idle="Save permissions" busy="Saving…" />
          <Alerts states={[permState]} />
        </form>
      )}

      {panel === "password" && (
        <form action={pwdAction} className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`pwd-${admin.id}`} className="admin-label mb-1 block">
                New password
              </label>
              <input
                id={`pwd-${admin.id}`}
                name="password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="admin-input"
              />
            </div>
            <div>
              <label htmlFor={`pwd2-${admin.id}`} className="admin-label mb-1 block">
                Repeat it
              </label>
              <input
                id={`pwd2-${admin.id}`}
                name="confirmPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="admin-input"
              />
              {pwdState.errors?.confirmPassword && (
                <p role="alert" className="mt-1 text-[0.75rem] font-medium text-[theme(colors.danger.fg)]">
                  {pwdState.errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
          <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
            Nothing is emailed. Tell them yourself, and they can change it after signing in.
          </p>
          <Submit idle="Set the password" busy="Saving…" />
          <Alerts states={[pwdState]} />
        </form>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--admin-ink-50)]">
        {label}
      </dt>
      <dd className="text-[1.25rem] font-bold tabular-nums text-[color:var(--admin-ink)]">
        {value}
      </dd>
    </div>
  );
}

function Alerts({ states }: { states: { ok: boolean; message?: string }[] }) {
  const shown = states.filter((state) => state.message);
  if (shown.length === 0) return null;
  return (
    <>
      {shown.map((state, index) => (
        <AdminAlert key={index} ok={state.ok}>
          {state.message}
        </AdminAlert>
      ))}
    </>
  );
}

function Submit({
  idle,
  busy,
  icon,
  danger,
  disabled,
}: {
  idle: string;
  busy: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={danger ? "admin-btn admin-btn-danger" : "admin-btn admin-btn-secondary"}
    >
      {!pending && icon}
      {pending ? busy : idle}
    </button>
  );
}
