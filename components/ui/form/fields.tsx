"use client";

import { useEffect, useId, useRef } from "react";
import {
  Controller,
  useFormContext,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import {
  formatCardExpiry,
  formatCardNumber,
  formatDate,
  formatDea,
  formatNpi,
  formatUsPhone,
  formatZip,
} from "@/lib/masks";
import { cn } from "@/lib/utils";

/* ===========================================================================
   React Hook Form field kit.

   These sit alongside native.tsx rather than replacing it. The two serve
   genuinely different jobs and merging them would make both worse:

     · native.tsx  — the public marketing forms. Native posts to server
       actions, zero client validation, works with JavaScript disabled. That is
       a deliberate property for a page a patient might load on a bad
       connection, and RHF would take it away.

     · fields.tsx  — this kit. For the long authenticated forms (the
       account-setup questionnaire, the admin editors) where a user types
       forty fields and must not discover a typo in field three after a round
       trip. Here the client validation is the feature.

   Every field self-wires through `useFormContext`, so a form is a list of
   names rather than a list of `register` calls, and `FieldPath<T>` makes a
   misspelled name a compile error instead of a field that silently never
   submits.

   MASKS ARE DISPLAY-ONLY. A masked field stores what the user sees; the
   schema's `transform` converts it to storage form (E.164, ISO date) at
   submit. Never trust the mask — the same Zod schema re-runs on the server.
   ========================================================================= */

type BaseProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  optional?: boolean;
  hint?: string;
  className?: string;
};

/** Shared label + control + error scaffolding, so no field re-invents it. */
function Field({
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
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-caption text-ink-muted">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Reads the error for a dotted path like `prescribers.0.deaNumber`. */
function errorAt(errors: Record<string, unknown>, path: string): string | undefined {
  const node = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, errors);

  if (node && typeof node === "object" && "message" in node) {
    return String((node as { message?: unknown }).message ?? "") || undefined;
  }
  return undefined;
}

export function TextField<T extends FieldValues>({
  name,
  label,
  optional,
  hint,
  className,
  type = "text",
  placeholder,
  autoComplete,
}: BaseProps<T> & { type?: string; placeholder?: string; autoComplete?: string }) {
  const id = useId();
  const { register, formState } = useFormContext<T>();
  const error = errorAt(formState.errors as Record<string, unknown>, name);

  return (
    <Field id={id} label={label} optional={optional} hint={hint} error={error} className={className}>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
    </Field>
  );
}

/* --- Masked fields ------------------------------------------------------- */

const MASKS = {
  phone: { format: formatUsPhone, inputMode: "tel" as const, placeholder: "(727) 555-0142" },
  date: { format: formatDate, inputMode: "numeric" as const, placeholder: "mm-dd-yyyy" },
  dea: { format: formatDea, inputMode: "text" as const, placeholder: "AB1234563" },
  npi: { format: formatNpi, inputMode: "numeric" as const, placeholder: "1234567893" },
  zip: { format: formatZip, inputMode: "numeric" as const, placeholder: "34683" },
  card: { format: formatCardNumber, inputMode: "numeric" as const, placeholder: "4242 4242 4242 4242" },
  expiry: { format: formatCardExpiry, inputMode: "numeric" as const, placeholder: "MM / YY" },
};

/**
 * A text input that reformats as the user types.
 *
 * Uses `Controller` rather than `register` because the value has to be
 * rewritten on every keystroke. `inputMode` matters as much as the mask
 * itself — it is what puts a numeric keypad in front of someone filling this
 * in on a phone, which is most of them.
 *
 * TWO THINGS HERE ARE NOT OPTIONAL, AND BOTH WERE BUGS FIRST
 * ----------------------------------------------------------
 * 1. NO `maxLength`. The mask already caps the length, and the attribute on
 *    top of it makes a full field uneditable: the browser refuses any
 *    insertion once the cap is reached, so a user who clicks into
 *    "(727) 555-0142" to fix the third digit has their keystroke silently
 *    dropped. They can only clear the whole field and start again.
 *
 * 2. THE CARET IS RESTORED BY HAND. A controlled input whose value is
 *    rewritten on change loses its selection, and React puts the caret at the
 *    end — so editing anywhere but the end is impossible. The restore counts
 *    *significant* characters (the ones the mask keeps) before the caret
 *    rather than raw offsets, because the separators the mask inserts shift
 *    every position after them.
 */
export function MaskedField<T extends FieldValues>({
  name,
  label,
  optional,
  hint,
  className,
  mask,
  placeholder,
  autoComplete,
}: BaseProps<T> & { mask: keyof typeof MASKS; placeholder?: string; autoComplete?: string }) {
  const id = useId();
  const { control, formState } = useFormContext<T>();
  const error = errorAt(formState.errors as Record<string, unknown>, name);
  const spec = MASKS[mask];
  const elementRef = useRef<HTMLInputElement | null>(null);

  return (
    <Field id={id} label={label} optional={optional} hint={hint} error={error} className={className}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <MaskedInput
            id={id}
            spec={spec}
            field={field}
            elementRef={elementRef}
            placeholder={placeholder}
            autoComplete={autoComplete}
            error={error}
          />
        )}
      />
    </Field>
  );
}


/**
 * The controlled input behind `MaskedField`.
 *
 * Split out of the `Controller` render prop so it can hold a hook — the
 * mount-time sync below needs one.
 */
function MaskedInput({
  id,
  spec,
  field,
  elementRef,
  placeholder,
  autoComplete,
  error,
}: {
  id: string;
  spec: (typeof MASKS)[keyof typeof MASKS];
  field: {
    name: string;
    value: unknown;
    onChange: (value: string) => void;
    onBlur: () => void;
    ref: (node: HTMLInputElement | null) => void;
  };
  elementRef: React.MutableRefObject<HTMLInputElement | null>;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  /*
   * Adopt anything typed before hydration.
   *
   * The server sends the input with an empty value; React attaches listeners
   * some milliseconds later. A fast typist on a slow connection can fill a
   * field in that gap — those keystrokes reach the DOM but not the form
   * state, and the first controlled render silently erases them. Reading the
   * DOM once on mount hands that input back to the form instead of losing it.
   */
  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const typedEarly = node.value;
    if (typedEarly && !String(field.value ?? "")) {
      field.onChange(spec.format(typedEarly));
    }
    // Mount only: re-running this would fight the user's own edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Input
      id={id}
      name={field.name}
      inputMode={spec.inputMode}
      placeholder={placeholder ?? spec.placeholder}
      autoComplete={autoComplete}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      value={spec.format(String(field.value ?? ""))}
      onChange={(event) => {
        const element = event.target;
        const caret = element.selectionStart ?? element.value.length;
        // How many mask-significant characters sit before the caret.
        const significantBefore = countSignificant(element.value.slice(0, caret));
        const formatted = spec.format(element.value);

        field.onChange(formatted);

        // After React has written the new value, walk the formatted string
        // until the same number of significant characters have been passed,
        // and put the caret there.
        window.requestAnimationFrame(() => {
          const node = elementRef.current;
          if (!node || document.activeElement !== node) return;

          let index = 0;
          let seen = 0;
          while (index < formatted.length && seen < significantBefore) {
            if (SIGNIFICANT.test(formatted[index]!)) seen += 1;
            index += 1;
          }
          node.setSelectionRange(index, index);
        });
      }}
      onBlur={field.onBlur}
      ref={(node) => {
        elementRef.current = node;
        field.ref(node);
      }}
    />
  );
}

/** Characters a mask preserves; everything else is inserted punctuation. */
const SIGNIFICANT = /[0-9A-Za-z]/;

function countSignificant(value: string): number {
  let count = 0;
  for (const character of value) if (SIGNIFICANT.test(character)) count += 1;
  return count;
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  optional,
  hint,
  className,
  options,
  placeholder = "Select…",
}: BaseProps<T> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const id = useId();
  const { register, formState } = useFormContext<T>();
  const error = errorAt(formState.errors as Record<string, unknown>, name);

  return (
    <Field id={id} label={label} optional={optional} hint={hint} error={error} className={className}>
      <Select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function TextAreaField<T extends FieldValues>({
  name,
  label,
  optional,
  hint,
  className,
  rows = 4,
  placeholder,
}: BaseProps<T> & { rows?: number; placeholder?: string }) {
  const id = useId();
  const { register, formState } = useFormContext<T>();
  const error = errorAt(formState.errors as Record<string, unknown>, name);

  return (
    <Field id={id} label={label} optional={optional} hint={hint} error={error} className={className}>
      <Textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
    </Field>
  );
}

export function CheckboxField<T extends FieldValues>({
  name,
  label,
  hint,
  className,
}: Omit<BaseProps<T>, "optional"> & { hint?: string }) {
  const id = useId();
  const { register, formState } = useFormContext<T>();
  const error = errorAt(formState.errors as Record<string, unknown>, name);

  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
          {...register(name)}
        />
        <span>
          <span className="block text-meta font-medium text-ink">{label}</span>
          {hint && <span className="mt-0.5 block text-caption text-ink-muted">{hint}</span>}
        </span>
      </label>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Radio cards — the whole card is the hit target, per the marketing forms. */
export function RadioCards<T extends FieldValues>({
  name,
  label,
  className,
  options,
}: Omit<BaseProps<T>, "optional"> & {
  options: { value: string; label: string; hint?: string }[];
}) {
  const { register, formState } = useFormContext<T>();
  const error = errorAt(formState.errors as Record<string, unknown>, name);

  return (
    <fieldset className={className}>
      <legend className="text-label font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </legend>
      <div className={cn("mt-3 grid gap-2", options.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-3 rounded-[0.5rem] border border-line bg-white p-3 transition-colors has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/60"
          >
            <input
              type="radio"
              value={o.value}
              className="mt-0.5 h-4 w-4 border-line text-brand-600 focus:ring-brand-500"
              {...register(name)}
            />
            <span>
              <span className="block text-meta font-medium text-ink">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-caption text-ink-muted">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  );
}
