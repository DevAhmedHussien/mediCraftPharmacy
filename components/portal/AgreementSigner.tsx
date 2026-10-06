"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { signAgreementAction } from "@/app/portal/actions";
import { FormAlert } from "@/components/ui/form/submit";
import { initialFormState } from "@/lib/forms";

/**
 * Typed-name signature capture.
 *
 * The disclosure above the box is not boilerplate: it is what makes a typed
 * name an electronic signature rather than a text field. It states what is
 * recorded, and the copy deliberately does not overclaim — this is the
 * internal driver, and it says so when a signing platform is not in use.
 *
 * WHY THE ACTION IS A PROP
 * ------------------------
 * A change order is signed exactly the way the MSA is — same typed name, same
 * disclosure, same hash check — but it is a different document completing a
 * different envelope. Passing the action in means one signature box with one
 * set of accessibility and error handling, rather than a near-copy that drifts
 * the first time one of them is fixed. The labels move with it so the consent
 * sentence names the document actually being signed.
 */
export function AgreementSigner({
  disclosure,
  driver,
  action: submitAction = signAgreementAction,
  heading = "Sign the agreement",
  consent = "I have read the Master Service Agreement above and I am authorised to sign it on behalf of my practice.",
  submitLabel = "Sign agreement",
}: {
  disclosure: string;
  driver: "INTERNAL" | "DOCUSIGN" | "SIGNEASY";
  /** The server action that records the signature. Defaults to the MSA's. */
  action?: typeof signAgreementAction;
  heading?: string;
  consent?: string;
  submitLabel?: string;
}) {
  const [state, action] = useFormState(submitAction, initialFormState);

  return (
    <form action={action} className="rounded-tile border border-line p-6">
      <h2 className="text-[1.0625rem] font-bold text-ink">{heading}</h2>

      <p className="mt-3 whitespace-pre-line text-caption leading-relaxed text-ink-muted">
        {disclosure}
      </p>

      {state.message && <FormAlert ok={state.ok} message={state.message} />}

      <label className="mt-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="agreed"
          required
          className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-500"
        />
        <span className="text-meta text-ink">{consent}</span>
      </label>
      {state.errors?.agreed && (
        <p role="alert" className="mt-1.5 text-caption font-medium text-danger-fg">
          {state.errors.agreed}
        </p>
      )}

      <div className="mt-5">
        <label htmlFor="typedName" className="block text-meta font-medium text-ink">
          Your full legal name
        </label>
        <input
          id="typedName"
          name="typedName"
          type="text"
          required
          autoComplete="name"
          aria-invalid={Boolean(state.errors?.typedName)}
          placeholder="Elena Ruiz"
          className="mt-2 w-full max-w-sm rounded-[0.5rem] border border-line bg-white px-3 py-2.5 font-serif text-[1.25rem] text-ink placeholder:font-sans placeholder:text-[0.9375rem] placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {state.errors?.typedName && (
          <p role="alert" className="mt-1.5 text-caption font-medium text-danger-fg">
            {state.errors.typedName}
          </p>
        )}
      </div>

      <div className="mt-6">
        <SignButton label={submitLabel} />
      </div>

      {driver === "INTERNAL" && (
        <p className="mt-4 text-caption text-ink-muted">
          Signed in-app. When DocuSign is configured this step moves there and produces a signed
          PDF with an audit certificate.
        </p>
      )}
    </form>
  );
}

function SignButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn-accent btn-lg">
      {pending && <Loader2 className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />}
      {pending ? "Signing…" : label}
    </button>
  );
}
