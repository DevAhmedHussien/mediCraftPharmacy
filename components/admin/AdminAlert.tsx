import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

/**
 * A banner in the admin's register.
 *
 * THREE TONES, NOT TWO
 * --------------------
 * This took a boolean, so everything that was not a success was painted as a
 * failure. That is wrong for the common third case: a standing fact the
 * operator should know before they act — "three times are already offered,
 * saving replaces them". Nothing has gone wrong there, but it was rendered in
 * the failure red and, worse, announced as `role="alert"`, which interrupts a
 * screen-reader user mid-sentence for information that is merely useful.
 *
 * `role` follows the tone: a success or a notice is a status a screen reader
 * picks up when it reaches it; only a real failure interrupts, because the
 * user is about to act on something that did not happen.
 *
 * The boolean form still works — `ok` maps onto success/error — so the dozen
 * form banners that pass `ok={state.ok}` did not have to change.
 */
export type AlertTone = "success" | "error" | "info";

const STYLES: Record<AlertTone, { border: string; background: string; color: string }> = {
  success: { border: "#bcd9c6", background: "var(--status-success-bg)", color: "var(--status-success-fg)" },
  error: { border: "color-mix(in srgb, var(--status-danger-fg) 30%, transparent)", background: "var(--status-danger-bg)", color: "var(--status-danger-fg)" },
  info: { border: "#c3d2f0", background: "var(--status-info-bg)", color: "#2c4a68" },
};

const ICONS: Record<AlertTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function AdminAlert({
  ok,
  tone,
  children,
}: {
  /** Shorthand: true → success, false → error. Ignored when `tone` is given. */
  ok?: boolean;
  tone?: AlertTone;
  children: ReactNode;
}) {
  const resolved: AlertTone = tone ?? (ok ? "success" : "error");
  const Icon = ICONS[resolved];
  const style = STYLES[resolved];

  return (
    <p
      role={resolved === "error" ? "alert" : "status"}
      className="mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[0.8125rem]"
      style={{ borderColor: style.border, background: style.background, color: style.color }}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
      {children}
    </p>
  );
}
