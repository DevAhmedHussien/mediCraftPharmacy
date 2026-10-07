"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

/**
 * Error boundary for the admin area.
 *
 * A backstop, not the mechanism: the guards in lib/guard.ts redirect rather
 * than throw precisely so a wrong URL never reaches here. What this catches is
 * the genuinely unexpected — a database that went away mid-render, a bug.
 *
 * Without it, Next renders its own overlay: a stack trace pointing at
 * `lib/guard.ts` line 41, shown to a pharmacist who clicked the wrong link.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The detail belongs in the server log, not on the screen.
    console.error("[admin] render error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger-fg">
        <AlertCircle className="h-6 w-6" strokeWidth={2} aria-hidden />
      </span>

      <h1 className="mt-6 text-[1.5rem] font-black text-ink">Something went wrong</h1>
      <p className="mt-3 text-meta text-ink-soft text-pretty">
        This screen could not be loaded. The error has been logged.
        {error.digest && (
          <>
            {" "}
            Reference <span className="font-mono text-caption">{error.digest}</span>.
          </>
        )}
      </p>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary btn-md">
          Try again
        </button>
        <Link href="/admin" className="btn-outline btn-md">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
