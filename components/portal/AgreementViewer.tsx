"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

/* ===========================================================================
   The MSA as a PDF, in place.

   The agreement used to be a `target="_blank"` link to /api/agreement/<id>.
   That route answers with `Content-Disposition: attachment`, so the new tab
   opened blank and the file landed in Downloads — the link appeared broken
   even though it worked. Worse, it took the partner out of the page they were
   in the middle of signing.

   So: fetch the bytes, show them in a dialog, and make downloading a button
   rather than the only outcome.

   WHY THE FETCH IS LAZY
   ---------------------
   This PDF is the whole agreement plus the negotiated price schedule plus the
   ~700-line formulary — comfortably the largest thing the portal serves. It
   is requested when the partner asks to see it, not on page load, so opening
   the agreement page stays cheap for the majority who only read the text
   inline and sign.

   The blob is kept after the dialog closes: reopening is then instant, and
   the bytes are already in memory for the Download button either way.
   ========================================================================= */

export function AgreementViewer({
  partnerId,
  companyName,
  label,
  signed,
  variant = "link",
  className,
}: {
  partnerId: string;
  companyName: string;
  /** Link text. The call to action differs before and after signing. */
  label: string;
  signed: boolean;
  /**
   * How the trigger looks.
   *
   * `link` is the quiet inline version used beside other prose. `button` is
   * the real call to action for the page whose entire job is "read this
   * agreement" — where a 12px underlined link was asking someone to find the
   * document they came for.
   */
  variant?: "link" | "button";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A stable, meaningful filename. The browser uses this verbatim, and
  // "agreement.pdf" in a folder of agreements helps nobody.
  const filename = `MediCraft-MSA-${companyName.replace(/[^a-z0-9]+/gi, "-")}${
    signed ? "-signed" : ""
  }.pdf`;

  useEffect(() => {
    if (!open || blobUrl || error) return;

    let cancelled = false;
    let created: string | null = null;

    (async () => {
      try {
        const response = await fetch(`/api/agreement/${partnerId}`);
        if (!response.ok) throw new Error(String(response.status));

        const blob = await response.blob();
        if (cancelled) return;

        created = URL.createObjectURL(blob);
        setBlobUrl(created);
      } catch {
        if (!cancelled) {
          setError("We could not open the agreement. Try the download instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, blobUrl, error, partnerId]);

  // Released on unmount rather than on close, since the blob outlives the
  // dialog on purpose.
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          variant === "button"
            ? "btn-primary btn-lg w-full justify-center sm:w-auto"
            : "link-arrow inline-flex text-caption",
          className
        )}
      >
        <FileText
          className={variant === "button" ? "size-[1.125rem]" : "size-3.5"}
          strokeWidth={2.2}
          aria-hidden
        />
        {label}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="wide"
        padded={false}
        title="Master Service Agreement"
        subtitle={
          signed
            ? "Signed copy, including your agreed prices and the full formulary"
            : "Your agreed prices are Exhibit A-1, after the body of the agreement"
        }
        actions={
          <a
            href={blobUrl ?? `/api/agreement/${partnerId}`}
            download={filename}
            className="btn-outline btn-sm"
          >
            <Download className="size-3.5" strokeWidth={2.4} aria-hidden />
            Download
          </a>
        }
      >
        <div className="min-h-[18rem] bg-sand">
          {error ? (
            <p className="px-6 py-16 text-center text-meta text-ink-soft">{error}</p>
          ) : !blobUrl ? (
            <p className="flex items-center justify-center gap-2 px-6 py-16 text-meta text-ink-muted">
              <Loader2 className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />
              Preparing your agreement…
            </p>
          ) : (
            <iframe
              src={blobUrl}
              tabIndex={-1}
              title="Master Service Agreement"
              className="h-[70vh] w-full border-0"
            />
          )}
        </div>
      </Modal>
    </>
  );
}
