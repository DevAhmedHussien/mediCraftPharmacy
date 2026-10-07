"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

/* ===========================================================================
   The submit half of a React Hook Form, once.

   Every long form in this app does the same four things on submit: call a
   server action, survive the action failing at the transport layer, push any
   field errors the server found back onto their fields, and navigate only
   after the success banner has had a chance to render. That was copied into
   three components and was about to be copied into a fourth.

   THE TRANSPORT CATCH IS NOT DEFENSIVE PADDING. A server action that throws —
   a dropped connection, a deploy mid-submit, a `redirect()` inside the action
   — returns `undefined` to the caller, and `response.ok` on undefined is a
   TypeError rendered as a full-screen crash over a form someone just spent
   ten minutes filling in. It has happened here once already.
   ========================================================================= */

/** The shape every action in this codebase returns. */
export type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  /** Where to go on success. The action returns it; it must not redirect itself. */
  redirectTo?: string;
};

export type Banner = { ok: boolean; message: string } | null;

/** How long the success banner stays on screen before navigating away. */
const BANNER_DWELL_MS = 900;

export function useFormAction<T extends FieldValues>(
  form: UseFormReturn<T>,
  action: (values: T) => Promise<ActionResult>,
  options: { resetTo?: T } = {}
) {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner>(null);
  const { resetTo } = options;

  const submit = useCallback(
    async (values: T) => {
      setBanner(null);

      let response: ActionResult;
      try {
        response = await action(values);
      } catch {
        setBanner({
          ok: false,
          message: "We could not reach the server. Please check your connection and try again.",
        });
        return;
      }

      // An action that resolved to nothing is a bug in the action, not a
      // success. Saying so beats reading `.ok` off undefined.
      if (!response) {
        setBanner({ ok: false, message: "Something went wrong. Please try again." });
        return;
      }

      if (!response.ok && response.fieldErrors) {
        // The server found something the client could not — a duplicate email,
        // most often. Put it back on the field rather than in a banner.
        for (const [path, message] of Object.entries(response.fieldErrors)) {
          form.setError(path as never, { message });
        }
      }

      setBanner({ ok: response.ok, message: response.message });

      if (response.ok) {
        if (resetTo) form.reset(resetTo);
        if (response.redirectTo) {
          const to = response.redirectTo;
          setTimeout(() => router.push(to), BANNER_DWELL_MS);
        } else {
          router.refresh();
        }
      }
    },
    [action, form, resetTo, router]
  );

  return { banner, setBanner, onSubmit: form.handleSubmit(submit as never) };
}

/** The one definition of what a result banner looks like. */
const bannerClass = (ok: boolean) =>
  ok
    ? "flex items-start gap-2.5 rounded-tile border border-success-fg/25 bg-success-bg px-4 py-3 text-meta text-success-fg"
    : "flex items-start gap-2.5 rounded-tile border border-danger-fg/25 bg-danger-bg px-4 py-3 text-meta text-danger-fg";

export function FormBanner({ banner }: { banner: Banner }) {
  if (!banner) return null;

  return (
    <p role={banner.ok ? "status" : "alert"} className={bannerClass(banner.ok)}>
      {banner.ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      )}
      {banner.message}
    </p>
  );
}

/**
 * Hidden from people, irresistible to naive bots.
 *
 * Not `display:none` — some bots skip those. Off-screen with tabindex -1 and
 * aria-hidden keeps it out of the tab order and out of a screen reader.
 */
export function Honeypot({ register }: { register: Record<string, unknown> }) {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor="nickname">Leave this field empty</label>
      <input id="nickname" type="text" tabIndex={-1} autoComplete="off" {...register} />
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel = "Submitting…",
  className = "btn-accent btn-lg",
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />}
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * The same banner, for forms driven by `useFormState` rather than React Hook
 * Form — the server-action forms pass a loose `{ ok, message }` instead of a
 * `Banner` object.
 *
 * `role="status"` rather than `role="alert"` even for failures, which is why
 * this is not simply FormBanner with different props: on those forms the
 * field-level FieldError nodes are already the alerts, and firing both makes a
 * screen reader announce the same failure twice. Only the styling is shared.
 */
export function FormAlert({ ok, message }: { ok: boolean; message?: string }) {
  if (!message) return null;

  return (
    <p role="status" className={bannerClass(ok)}>
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      )}
      {message}
    </p>
  );
}

/** A numbered step heading inside a multi-section form. */
export function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-[0.6rem] bg-brand-500 text-caption font-black text-white">
        {step}
      </span>
      <h3 className="text-[1.0625rem] font-bold text-ink">{title}</h3>
    </div>
  );
}
