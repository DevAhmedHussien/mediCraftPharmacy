"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Loader2, X } from "lucide-react";

import {
  adminDocumentUrl,
  reviewDocument,
} from "@/app/admin/partners/[id]/document-actions";
import { Panel, Pill, type Tone } from "@/components/admin/ui";
import { DocumentDialog, type ViewableDocument } from "@/components/DocumentDialog";

/* ===========================================================================
   The reviewer's view of what was uploaded.

   Deliberately not an image preview grid: these are licences and photo IDs,
   and rendering them inline puts regulated identifiers on screen for anyone
   walking past a reviewer's desk. One click, one presigned link, one download,
   logged.
   ========================================================================= */

export type ReviewDocument = {
  id: string;
  label: string;
  filename: string;
  mime: string;
  size: number;
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
  reviewerComment: string | null;
  uploadedAt: string;
};

const TONES: Record<ReviewDocument["status"], Tone> = {
  ACCEPTED: "good",
  REJECTED: "bad",
  PENDING_REVIEW: "warn",
};

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentReview({ documents }: { documents: ReviewDocument[] }) {
  const [viewing, setViewing] = useState<ViewableDocument | null>(null);

  if (documents.length === 0) {
    return (
      <Panel title="Documents">
        <p className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">
          Nothing uploaded yet.
        </p>
      </Panel>
    );
  }

  const pending = documents.filter((doc) => doc.status === "PENDING_REVIEW").length;

  return (
    <Panel
      title="Documents"
      description={
        pending > 0
          ? `${pending} waiting on a decision. Identifiers download rather than preview.`
          : "Every upload has a decision."
      }
    >
      <div className="space-y-2">
        {documents.map((doc) => (
          <Row key={doc.id} document={doc} onOpen={setViewing} />
        ))}
      </div>

      <DocumentDialog
        document={viewing}
        onClose={() => setViewing(null)}
        fetchUrl={adminDocumentUrl}
      />
    </Panel>
  );
}

function Row({
  document,
  onOpen,
}: {
  document: ReviewDocument;
  onOpen: (doc: ViewableDocument) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "ACCEPTED" | "REJECTED") =>
    startTransition(async () => {
      setError(null);
      const result = await reviewDocument({
        documentId: document.id,
        decision,
        comment: decision === "REJECTED" ? comment : undefined,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRejecting(false);
      setComment("");
      router.refresh();
    });

  return (
    <div className="rounded-[5px] border p-3" style={{ borderColor: "var(--admin-border)" }}>
      <div className="flex flex-wrap items-center gap-3">
        <Pill tone={TONES[document.status]}>{document.status.replace(/_/g, " ").toLowerCase()}</Pill>

        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] font-semibold">{document.label}</span>
          <span className="block truncate text-[0.75rem] text-[color:var(--admin-ink-50)]">
            {document.filename} · {readableSize(document.size)}
          </span>
        </span>

        <button
          type="button"
          onClick={() =>
            onOpen({
              id: document.id,
              label: document.label,
              filename: document.filename,
              mime: document.mime,
              size: document.size,
            })
          }
          className="admin-btn admin-btn-secondary"
        >
          <Eye className="size-3.5" strokeWidth={2} aria-hidden />
          Open
        </button>

        {document.status !== "ACCEPTED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => decide("ACCEPTED")}
            className="admin-btn admin-btn-secondary"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} aria-hidden />
            ) : (
              <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
            )}
            Accept
          </button>
        )}

        {document.status !== "REJECTED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setRejecting((open) => !open)}
            className="admin-btn admin-btn-danger"
          >
            <X className="size-3.5" strokeWidth={2.4} aria-hidden />
            Reject
          </button>
        )}
      </div>

      {rejecting && (
        <div className="mt-3">
          <label htmlFor={`why-${document.id}`} className="admin-label">
            What is wrong with it?
          </label>
          <textarea
            id={`why-${document.id}`}
            rows={2}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="The expiry date is cut off — please re-scan the whole certificate."
            className="admin-input mt-1.5 w-full"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("REJECTED")}
              className="admin-btn admin-btn-primary"
            >
              Send back
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="text-[0.75rem] font-medium text-[color:var(--admin-ink-50)] hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[0.75rem] font-medium text-[#9c3a2a]">
          {error}
        </p>
      )}

      {document.reviewerComment && document.status === "REJECTED" && (
        <p className="mt-2 text-[0.75rem] text-[color:var(--admin-ink-50)]">
          Sent back: {document.reviewerComment}
        </p>
      )}
    </div>
  );
}
