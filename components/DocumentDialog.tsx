"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Look at an uploaded file without leaving the page.

   Opening a document used to call `window.open` on a presigned URL, which
   dropped a new browser tab on the user, lost the context they were working
   in, and — because the download header is `attachment` — often produced a
   blank tab and a file in the downloads folder rather than anything to look
   at.

   This fetches the bytes once, shows them in place, and offers a download as a
   button rather than as the only behaviour. The presigned URL never reaches
   the address bar, so a copied link cannot be passed around while it is still
   valid.

   The dialog shell — focus trap, scroll lock, Escape, focus restore — is
   `Modal`. This file is only about getting the bytes and choosing a viewer
   for them.
   ========================================================================= */

export type ViewableDocument = {
  id: string;
  label: string;
  filename: string;
  mime?: string | null;
  size?: number | null;
};

function readableSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentDialog({
  document: doc,
  onClose,
  fetchUrl,
}: {
  document: ViewableDocument | null;
  onClose: () => void;
  /** Returns a short-lived URL for this id, or null if it is gone. */
  fetchUrl: (id: string) => Promise<string | null>;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;

    let cancelled = false;
    let created: string | null = null;

    setBlobUrl(null);
    setError(null);

    (async () => {
      try {
        const url = await fetchUrl(doc.id);
        if (!url) throw new Error("gone");

        const response = await fetch(url);
        if (!response.ok) throw new Error(String(response.status));

        const blob = await response.blob();
        if (cancelled) return;

        /* A blob URL rather than the presigned one.
           The signed link is a capability with a five-minute life; putting it
           in an <iframe src> leaves it in the DOM and in the history. */
        created = URL.createObjectURL(blob);
        setBlobUrl(created);
      } catch {
        if (!cancelled) setError("We could not open that file. Try downloading it instead.");
      }
    })();

    return () => {
      cancelled = true;
      // Revoking matters here: these are whole documents, not thumbnails.
      if (created) URL.revokeObjectURL(created);
    };
  }, [doc, fetchUrl]);

  if (!doc) return null;

  const isImage = (doc.mime ?? "").startsWith("image/");
  const isPdf = (doc.mime ?? "").includes("pdf");

  return (
    <Modal
      open
      onClose={onClose}
      size="wide"
      padded={false}
      title={doc.label}
      subtitle={`${doc.filename}${doc.size ? ` · ${readableSize(doc.size)}` : ""}`}
      actions={
        <a
          href={blobUrl ?? undefined}
          download={doc.filename}
          aria-disabled={!blobUrl}
          className={cn("btn-outline btn-sm", !blobUrl && "pointer-events-none opacity-40")}
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
            Opening…
          </p>
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={blobUrl} alt={doc.label} className="mx-auto max-h-full" />
        ) : isPdf ? (
          <iframe
            src={blobUrl}
            title={doc.label}
            /* Not a tab stop: Escape pressed inside the viewer never reaches
               this document. See the note in Modal. */
            tabIndex={-1}
            className="h-[70vh] w-full border-0"
          />
        ) : (
          <p className="flex flex-col items-center gap-3 px-6 py-16 text-center text-meta text-ink-soft">
            <FileText className="size-8 text-ink-muted" strokeWidth={1.6} aria-hidden />
            This file type cannot be previewed. Use Download to open it.
          </p>
        )}
      </div>
    </Modal>
  );
}
