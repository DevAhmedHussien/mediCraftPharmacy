import * as React from "react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   The field surface — one definition, shared by <Input>, <Textarea> and
   <Select>.

   This string previously lived inline in components/forms/Fields.tsx, which
   meant a field rendered anywhere else on the site (a newsletter box, a search
   input, a filter) had no way to match it except by copying the string. It is
   exported so those cases compose rather than duplicate.

   The focus treatment is deliberately loud — a 2px brand ring plus a border
   colour change. These are clinical intake forms where a prescriber is typing
   a DEA number, and the active field should never be ambiguous.

   `aria-[invalid=true]` drives the error border straight off the ARIA state,
   so a field cannot show as valid to a screen reader while looking invalid on
   screen; there is only one flag to set.
   ========================================================================= */
export const fieldClass =
  "w-full rounded-lg border-[1.5px] border-line bg-white px-4 py-3 text-meta text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-sand disabled:text-ink-muted aria-[invalid=true]:border-red-400";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldClass, className)} {...props} />
  )
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldClass, "resize-y", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/**
 * A native <select>, not Radix's.
 *
 * shadcn's Select is a Radix listbox — it is a client component, it needs
 * JavaScript to open, and it posts nothing on its own because it renders no
 * form control (it needs a paired hidden input). Every form on this site is a
 * server action that works with JavaScript disabled, so swapping this for the
 * Radix version would trade a working control for a prettier broken one.
 *
 * The native element also gives the correct mobile picker for free, which on a
 * fifty-item state list is materially better than a scrolling popover.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      /* `appearance-none` plus a chevron drawn as a background image: the
         native arrow cannot be styled and renders differently per platform,
         and the arrow has to sit on the same ink ramp as the rest of the
         system. `bg-[position]` keeps it clear of the text on long options. */
      className={cn(
        fieldClass,
        "appearance-none bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-11",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23636e89%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')]",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";

export { Input, Textarea, Select };
