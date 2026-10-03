import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * A result banner in the admin's register.
 *
 * `role` switches on outcome: a success is a status update a screen reader
 * can pick up when it gets to it, a failure is an alert that interrupts —
 * because the user is about to act on a thing that did not happen.
 */
export function AdminAlert({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? CheckCircle2 : AlertCircle;

  return (
    <p
      role={ok ? "status" : "alert"}
      className="mb-3 flex items-start gap-2 rounded-[5px] border px-3 py-2 text-[0.8125rem]"
      style={
        ok
          ? { borderColor: "#bcd9c6", background: "#f2f9f4", color: "#2c6b4d" }
          : { borderColor: "#e4b8ae", background: "#fdf4f2", color: "#9c3a2a" }
      }
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
      {children}
    </p>
  );
}
