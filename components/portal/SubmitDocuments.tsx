"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { submitDocuments } from "@/app/portal/documents/actions";

/**
 * The button that closes the applicant's half of the pipeline.
 *
 * Disabled while anything required is missing, but the server checks the same
 * rule again — a disabled button is a courtesy, not a gate.
 */
export function SubmitDocuments({ missing }: { missing: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const blocked = missing.length > 0;

  return (
    <div className="card p-6 md:p-8">
      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={
            result.ok
              ? "mb-5 flex items-start gap-2.5 rounded-tile border border-success-fg/25 bg-success-bg px-4 py-3 text-meta text-success-fg"
              : "mb-5 flex items-start gap-2.5 rounded-tile border border-danger-fg/25 bg-danger-bg px-4 py-3 text-meta text-danger-fg"
          }
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} aria-hidden />
          )}
          {result.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy || blocked}
          onClick={async () => {
            setBusy(true);
            setResult(null);
            try {
              const response = await submitDocuments();
              setResult({ ok: response.ok, message: response.message });
              if (response.ok && response.redirectTo) {
                setTimeout(() => router.push(response.redirectTo!), 900);
              }
            } catch {
              setResult({
                ok: false,
                message: "We could not reach the server. Your uploads are saved — please try again.",
              });
            } finally {
              setBusy(false);
            }
          }}
          className="btn-accent btn-lg"
        >
          {busy && <Loader2 className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />}
          {busy ? "Submitting…" : "Submit for review"}
        </button>

        <p className="text-caption text-ink-muted">
          {blocked
            ? `Still needed: ${missing.join(", ")}.`
            : "Everything required is here. We review within one to two business days."}
        </p>
      </div>
    </div>
  );
}
