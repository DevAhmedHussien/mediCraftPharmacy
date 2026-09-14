import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Field label.
 *
 * A plain <label>, not Radix's — Radix's Label exists to suppress text
 * selection on double-click and to forward clicks to non-native controls.
 * Every control on this site is native, where `htmlFor` already does that, so
 * the Radix version would add a client component for nothing.
 *
 * `optional` is a prop rather than something callers append to the label text
 * so the marker is worded and styled identically everywhere. Marking the
 * optional fields is the right way round: an intake form is mostly required,
 * and asterisking the majority reads as noise.
 */
export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  optional?: boolean;
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, optional, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-1.5 block text-sm font-medium text-ink-soft", className)}
      {...props}
    >
      {children}
      {optional && <span className="ml-1 text-xs text-ink-muted">(optional)</span>}
    </label>
  )
);
Label.displayName = "Label";

/**
 * The message under an invalid field.
 *
 * Rendered with `role="alert"` so a screen reader announces it when the server
 * action returns and the message appears, rather than leaving it to be
 * discovered on the next pass through the form.
 */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1.5 text-caption font-medium text-red-600">
      {message}
    </p>
  );
}

export { Label };
