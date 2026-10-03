"use client";

import { useId, type ChangeEventHandler } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   Admin form fields.

   The marketing set in components/ui/form/native.tsx is 44px tall with a 1rem
   label because it is filled in once, on a phone, by a patient. An operator
   fills in twelve fields with a keyboard and needs to see the whole form
   without scrolling, so these are 32px with a 0.8125rem label.

   Uncontrolled: the admin forms are server-rendered with their current values
   and posted to server actions, so React never needs to own the value — which
   is what keeps them working before hydration.
   ========================================================================= */

function FieldShell({
  id,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="admin-label mb-1 block">
        {label}
        {optional && (
          <span className="ml-1 font-normal normal-case tracking-normal opacity-70">
            (optional)
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[0.75rem] text-[color:var(--admin-ink-50)]">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[0.75rem] font-medium text-[#9c3a2a]">
          {error}
        </p>
      )}
    </div>
  );
}

export function AdminField({
  name,
  label,
  type = "text",
  optional,
  hint,
  error,
  defaultValue,
  value,
  onChange,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  defaultValue?: string | number;
  /**
   * Controlled mode, for the handful of admin forms whose fields are driven
   * by something other than typing — the meeting scheduler fills its boxes
   * from suggestion chips. Pass `value` WITH `onChange` or React warns; pass
   * neither and the field stays uncontrolled, which is what every other form
   * here wants.
   */
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();

  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      className={className}
    >
      <input
        id={id}
        name={name}
        type={type}
        required={!optional}
        {...(value === undefined ? { defaultValue } : { value, onChange })}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="admin-input"
      />
    </FieldShell>
  );
}

export function AdminTextArea({
  name,
  label,
  rows = 4,
  optional,
  hint,
  error,
  defaultValue,
  placeholder,
  className,
  mono,
}: {
  name: string;
  label: string;
  rows?: number;
  optional?: boolean;
  hint?: string;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  /** For Markdown and anything else where alignment carries meaning. */
  mono?: boolean;
}) {
  const id = useId();

  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      className={className}
    >
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={!optional}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("admin-input", mono && "font-mono text-[0.8125rem] leading-relaxed")}
      />
    </FieldShell>
  );
}

export function AdminReadOnly({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="admin-label mb-1">{label}</p>
      <p className="admin-id">{value}</p>
      {hint && <p className="mt-1 text-[0.75rem] text-[color:var(--admin-ink-50)]">{hint}</p>}
    </div>
  );
}

export function AdminSelect({
  name,
  label,
  options,
  optional,
  hint,
  error,
  defaultValue,
  placeholder = "Choose…",
  className,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  optional?: boolean;
  hint?: string;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();

  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      className={className}
    >
      <select
        id={id}
        name={name}
        required={!optional}
        defaultValue={defaultValue ?? ""}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="admin-input"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function AdminCheckbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  const id = useId();

  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-3.5 rounded border-[color:var(--admin-border-strong)] text-[color:var(--admin-accent)] focus:ring-[color:var(--admin-accent)]"
      />
      <span>
        <span className="block text-[0.8125rem] font-medium">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[0.75rem] text-[color:var(--admin-ink-50)]">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function AdminSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
      {pending && <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} aria-hidden />}
      {pending ? "Saving…" : children}
    </button>
  );
}
