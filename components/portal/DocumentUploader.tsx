"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DOCUMENT_ACCEPT,
  DOCUMENT_RULE,
  checkDocument,
  readableSize,
} from "@/lib/uploads";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import type { DocumentType } from "@prisma/client";

import {
  confirmUpload,
  documentDownloadUrl,
  removeDocument,
  requestUpload,
} from "@/app/portal/documents/actions";
import { DocumentDialog, type ViewableDocument } from "@/components/DocumentDialog";
import type { DocumentSpec } from "@/lib/partner/documents";

/* ===========================================================================
   One row of the document checklist.

   The bytes never pass through our server: `requestUpload` returns a
   short-lived URL, the browser PUTs to it, and `confirmUpload` records the
   row. Three steps, so three things can fail, and the component says which —
   "we could not reach storage" and "that file is too big" are different
   problems with different fixes.
   ========================================================================= */

export type UploadedDocument = {
  id: string;
  type: DocumentType;
  filename: string;
  mime: string;
  size: number;
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
  reviewerComment: string | null;
  uploadedAt: string;
};


export function DocumentRow({
  spec,
  documents,
  locked,
}: {
  spec: DocumentSpec;
  documents: UploadedDocument[];
  /** True once the file is with a reviewer — nothing may change under them. */
  locked: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [viewing, setViewing] = useState<ViewableDocument | null>(null);

  const usable = documents.filter((doc) => doc.status !== "REJECTED");
  const satisfied = usable.length > 0;

  async function upload(file: File) {
    setError(null);

    /* Checked here before anything is sent. The server checks again and is the
       real gate, but a partner who picked a 40 MB scan should be told so
       immediately rather than after a round trip — and `accept` on the input
       is only a filter, which most desktop pickers let you override. */
    const problem = checkDocument(file);
    if (problem) {
      setError(problem);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);

    try {
      const grant = await requestUpload({
        type: spec.type,
        filename: file.name,
        mime: file.type,
        size: file.size,
      });

      if (!grant.ok) {
        setError(grant.message);
        return;
      }

      const response = await fetch(grant.url, {
        method: "PUT",
        headers: grant.headers,
        body: file,
      });

      if (!response.ok) {
        setError("The upload did not complete. Please try again.");
        return;
      }

      const confirmed = await confirmUpload({
        type: spec.type,
        key: grant.key,
        filename: file.name,
        mime: file.type,
        size: file.size,
      });

      if (!confirmed.ok) {
        setError(confirmed.message ?? "We could not record that upload.");
        return;
      }

      router.refresh();
    } catch {
      setError("We could not reach storage. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-tile border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-meta font-bold text-ink">
            {satisfied ? (
              <CheckCircle2 className="size-4 shrink-0 text-success-fg" strokeWidth={2.4} aria-hidden />
            ) : (
              <span
                aria-hidden
                className={
                  spec.required
                    ? "size-2 shrink-0 rounded-full bg-warning-fg"
                    : "size-2 shrink-0 rounded-full bg-line"
                }
              />
            )}
            {spec.label}
            {!spec.required && (
              <span className="text-caption font-medium text-ink-muted">Optional</span>
            )}
          </h3>
          <p className="mt-1 max-w-prose text-caption text-ink-muted">{spec.blurb}</p>
          {/* The constraint, stated before it can be broken. */}
          <p className="mt-1.5 text-caption text-ink-muted">{DOCUMENT_RULE}</p>
        </div>

        {!locked && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="sr-only"
              id={`upload-${spec.type}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <label
              htmlFor={`upload-${spec.type}`}
              className="btn-outline btn-sm shrink-0 cursor-pointer"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} aria-hidden />
              ) : (
                <Upload className="size-3.5" strokeWidth={2.4} aria-hidden />
              )}
              {busy ? "Uploading…" : satisfied ? "Replace" : "Upload"}
            </label>
          </>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-danger-fg/25 bg-danger-bg px-3 py-2 text-caption font-medium text-danger-fg"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
          {error}
        </p>
      )}

      {documents.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-3">
              <StatusPill status={doc.status} />

              <span className="min-w-0 flex-1 truncate text-caption text-ink">
                {doc.filename}
                <span className="ml-2 text-ink-muted">{readableSize(doc.size)}</span>
              </span>

              <button
                type="button"
                onClick={() =>
                  setViewing({
                    id: doc.id,
                    label: spec.label,
                    filename: doc.filename,
                    mime: doc.mime,
                    size: doc.size,
                  })
                }
                className="inline-flex items-center gap-1 text-caption font-medium text-ink-soft hover:text-brand-600"
              >
                <Eye className="size-3.5" strokeWidth={2} aria-hidden />
                View
              </button>

              {!locked && doc.status !== "ACCEPTED" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await removeDocument(doc.id);
                      router.refresh();
                    })
                  }
                  className="inline-flex items-center gap-1 text-caption font-medium text-danger-fg hover:underline disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
                  Remove
                </button>
              )}

              {doc.reviewerComment && (
                <p className="w-full text-caption text-warning-fg">{doc.reviewerComment}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <DocumentDialog
        document={viewing}
        onClose={() => setViewing(null)}
        fetchUrl={documentDownloadUrl}
      />
    </div>
  );
}

function StatusPill({ status }: { status: UploadedDocument["status"] }) {
  if (status === "ACCEPTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-caption font-medium text-success-fg">
        <CheckCircle2 className="size-3" strokeWidth={2.4} aria-hidden />
        Accepted
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-caption font-medium text-danger-fg">
        <AlertCircle className="size-3" strokeWidth={2.4} aria-hidden />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-caption font-medium text-ink-soft">
      <Clock className="size-3" strokeWidth={2.4} aria-hidden />
      Uploaded
    </span>
  );
}
