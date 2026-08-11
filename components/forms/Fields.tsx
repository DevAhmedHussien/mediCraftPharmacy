"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

/* Squared-off inputs on a hairline border, matching the button system. The
   focus ring is the brand blue at full strength — this is a clinical form and
   the active field should be unmistakable. */
const inputClass =
  "w-full rounded-lg border-[1.5px] border-line bg-white px-4 py-3 text-meta text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100 aria-[invalid=true]:border-red-400";

function Label({ htmlFor, label, optional }: { htmlFor: string; label: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-soft">
      {label}
      {optional && <span className="ml-1 text-xs text-ink-muted">(optional)</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-caption font-medium text-red-600">{message}</p>;
}

export function TextField({
  name,
  label,
  type = "text",
  optional = false,
  error,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  optional?: boolean;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} label={label} optional={optional} />
      <input
        id={name}
        name={name}
        type={type}
        required={!optional}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className={inputClass}
      />
      <FieldError message={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  placeholder = "Select…",
  optional = false,
  error,
}: {
  name: string;
  label: string;
  options: string[];
  placeholder?: string;
  optional?: boolean;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} label={label} optional={optional} />
      <select
        id={name}
        name={name}
        required={!optional}
        defaultValue=""
        aria-invalid={!!error}
        className={inputClass}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export function TextArea({
  name,
  label,
  rows = 4,
  optional = false,
  error,
}: {
  name: string;
  label: string;
  rows?: number;
  optional?: boolean;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} label={label} optional={optional} />
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={!optional}
        aria-invalid={!!error}
        className={inputClass}
      />
      <FieldError message={error} />
    </div>
  );
}

export function RadioGroup({
  name,
  label,
  options,
  error,
}: {
  name: string;
  label: string;
  options: string[];
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 block text-caption font-bold text-ink">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-line bg-white px-4 py-3 text-meta text-ink-soft transition-colors hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
          >
            <input type="radio" name={name} value={o} className="accent-brand-600" />
            {o}
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-70">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Submitting…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormAlert({ ok, message }: { ok: boolean; message?: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg p-4 text-meta ${
        ok
          ? "border-[1.5px] border-cyan-300 bg-cyan-50 text-cyan-800"
          : "border-[1.5px] border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

export function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-[0.6rem] bg-brand-500 text-caption font-black text-white">
        {step}
      </span>
      <h3 className="text-[1.0625rem] font-bold text-ink">{title}</h3>
    </div>
  );
}
