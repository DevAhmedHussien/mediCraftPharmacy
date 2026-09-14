"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";

/* ===========================================================================
   The form field set.

   These are the composed, form-specific wrappers — label + control + error, in
   the one arrangement every MediCraft form uses. The controls themselves and
   their styling now live in components/ui, so a field rendered outside a form
   looks identical without copying a class string.

   All four forms on this site are server actions that work with JavaScript
   disabled. Two consequences run through this file:

     · `required` is set on the control, so the browser blocks an empty submit
       on its own and the server action is the backstop rather than the only
       check
     · errors arrive as props from the action's returned state — there is no
       client validation library here, and adding one would mean the form
       stopped working for anyone whose JS failed to load

   Each field derives its own ids with `useId()` rather than reusing `name`.
   Two fields with the same name on one page — the phone field on the contact
   and refill forms, say — would otherwise produce duplicate DOM ids and a
   label that points at the wrong control.
   ========================================================================= */

/** Wires a control to its label and, when present, its error message. */
function useFieldIds(error?: string) {
  const id = useId();
  const errorId = `${id}-error`;

  return {
    id,
    errorId,
    /* Only point at the error node when there is one; a dangling
       aria-describedby is announced as an empty description by some readers. */
    describedBy: error ? errorId : undefined,
    invalid: !!error,
  };
}

export function TextField({
  name,
  label,
  type = "text",
  optional = false,
  error,
  autoComplete,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  optional?: boolean;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const { id, errorId, describedBy, invalid } = useFieldIds(error);

  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        required={!optional}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <FieldError id={errorId} message={error} />
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
  const { id, errorId, describedBy, invalid } = useFieldIds(error);

  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <Select
        id={id}
        name={name}
        required={!optional}
        defaultValue=""
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        {/* `disabled` on the placeholder means it can be the initial value but
            cannot be chosen back once the user has picked something real. */}
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function TextArea({
  name,
  label,
  rows = 4,
  optional = false,
  error,
  placeholder,
}: {
  name: string;
  label: string;
  rows?: number;
  optional?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const { id, errorId, describedBy, invalid } = useFieldIds(error);

  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <Textarea
        id={id}
        name={name}
        rows={rows}
        required={!optional}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/**
 * A set of mutually exclusive options, styled as selectable cards.
 *
 * The whole card is the <label>, so the hit area is the card rather than the
 * 16px radio inside it — these are read on phones. `has-[:checked]` styles the
 * card from the real input's state, which keeps the native radio as the single
 * source of truth: no click handler, no local state, and it posts and restores
 * correctly with no JavaScript.
 */
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
  const { errorId } = useFieldIds(error);

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2.5 block text-caption font-bold text-ink">
        {label}
      </legend>
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
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

/**
 * The submit control.
 *
 * `useFormStatus` reads the pending state of the enclosing <form>, which is
 * why this has to be its own component rather than markup inside each form —
 * the hook reports nothing for a form rendered by the same component that
 * calls it.
 */
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      block
      disabled={pending}
      /* aria-disabled as well as disabled: some screen readers skip a disabled
         control entirely, so the label change alone would go unannounced. */
      aria-disabled={pending}
      className="disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Submitting…
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * The form-level result banner.
 *
 * `role="status"` rather than `role="alert"` even for failures: the field-level
 * FieldError nodes are the alerts, and firing both would make a screen reader
 * announce the same failure twice.
 */
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
