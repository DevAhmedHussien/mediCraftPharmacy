"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";


import { Button } from "@/components/ui/button";
import { formatUsPhone } from "@/lib/masks";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";

export { FormAlert, SectionTitle } from "@/components/ui/form/submit";

/* ===========================================================================
   The field set for forms that post natively to a server action.

   This sits beside fields.tsx — the React Hook Form kit — rather than being
   merged into it, because the two have genuinely different jobs:

     · native.tsx (this file) — the public marketing forms. A native post to a
       server action, no client validation library, works with JavaScript
       disabled. Pulling React Hook Form and a resolver into these pages would
       add client JS to every page carrying a form and take the no-JS path
       away; lib/forms.ts records a 152 kB to 179 kB first-load regression
       from a similar mistake.

     · fields.tsx — the long authenticated forms, where someone fills in forty
       fields and must not learn about a typo in field three after a round
       trip. There, client validation is the whole point.

   What they no longer have is two copies of the same primitives: the result
   banner and the section heading are defined once, in submit.tsx, and
   re-exported here.

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
  defaultValue,
  readOnly = false,
  hint,
  inputMode,
  maxLength,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  optional?: boolean;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  /** For a field that wants the numeric keypad on a phone — a code, a ZIP. */
  inputMode?: "numeric" | "tel" | "email" | "text";
  /** A hard cap the browser enforces, for fixed-length values. */
  maxLength?: number;
  /** Extra classes on the input itself — a code box wants its own setting. */
  className?: string;
  /**
   * Uncontrolled on purpose. The admin edit forms are server-rendered with
   * their current values and posted natively, so React never needs to own the
   * value — which is also what keeps them working before hydration.
   */
  defaultValue?: string | number;
  readOnly?: boolean;
  /** Explanatory note under the control, for anything the label cannot carry. */
  hint?: string;
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
        defaultValue={defaultValue}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
        className={className}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      {hint && !error && <p className="mt-1.5 text-caption text-ink-muted">{hint}</p>}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/**
 * A phone field that punctuates itself as it is typed.
 *
 * Same job as `MaskedField` in fields.tsx, done the way this file has to do
 * it: no React Hook Form, no controlled value, nothing that would stop the
 * form posting with JavaScript off. The input is uncontrolled and the mask is
 * applied to `el.value` directly, so before hydration this is an ordinary
 * `type="tel"` box and the server action — which parses the number either way
 * — gets the same answer.
 *
 * THE CARET. Reformatting mid-edit moves the caret to the end, which is
 * maddening for anyone correcting an area code. So the mask runs live only
 * while the caret is at the end of the value, which is how a number is
 * actually typed, and otherwise waits for blur. Backspacing over a ")" or a
 * "-" is left alone for the same reason: re-inserting the character the user
 * just deleted makes the key look broken.
 */
export function PhoneField({
  name,
  label,
  optional = false,
  error,
  autoComplete = "tel",
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  optional?: boolean;
  error?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
}) {
  const { id, errorId, describedBy, invalid } = useFieldIds(error);

  const reformat = (el: HTMLInputElement, live: boolean) => {
    const next = formatUsPhone(el.value);
    if (next === el.value) return;
    // Mid-edit: leave what they typed, blur will tidy it.
    if (live && el.selectionStart !== el.value.length) return;
    el.value = next;
    el.setSelectionRange(next.length, next.length);
  };

  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        required={!optional}
        autoComplete={autoComplete}
        placeholder="(727) 555-0142"
        defaultValue={defaultValue}
        maxLength={14}
        onInput={(e) => reformat(e.currentTarget, true)}
        onBlur={(e) => reformat(e.currentTarget, false)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      {hint && !error && <p className="mt-1.5 text-caption text-ink-muted">{hint}</p>}
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
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  placeholder?: string;
  optional?: boolean;
  error?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue ?? ""}
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
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  rows?: number;
  optional?: boolean;
  error?: string;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
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
        defaultValue={defaultValue}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      {hint && !error && <p className="mt-1.5 text-caption text-ink-muted">{hint}</p>}
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
export function ActionSubmitButton({
  children,
  name,
  value,
  block = true,
}: {
  children: React.ReactNode;
  /**
   * Submitter name/value, for a form with more than one thing it can do.
   *
   * The clicked button's pair is part of the FormData the browser sends, so a
   * single action can branch on it — and it still works with JavaScript off,
   * which a click handler setting client state would not.
   */
  name?: string;
  value?: string;
  /** Full width by default; `false` to sit beside something. */
  block?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    /* `loading` rather than a hand-rolled spinner. Button now owns the
       spinner, the disable and `aria-busy`; this was duplicating the first
       two and setting `aria-disabled` instead of the third. */
    <Button
      type="submit"
      name={name}
      value={value}
      block={block}
      loading={pending}
      /* aria-disabled as well as disabled: some screen readers skip a
         disabled control entirely, so the label change alone would go
         unannounced. */
      aria-disabled={pending}
      className="disabled:opacity-70"
    >
      {pending ? "Submitting…" : children}
    </Button>
  );
}
