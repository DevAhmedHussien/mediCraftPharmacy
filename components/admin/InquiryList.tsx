"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, ShieldAlert } from "lucide-react";

import { inquiryResumeUrl, readInquiry, triageInquiry } from "@/app/admin/inquiries/actions";
import { Cell, DataTable, Pill, Row, type Tone } from "@/components/admin/ui";

/* ===========================================================================
   Public-form submissions.

   A refill request is protected health information, so the list shows that one
   arrived and when — never its contents. Opening a record is a click, and that
   click is audited. Rendering four hundred patients' medication lists into a
   table because it was convenient is the failure mode this avoids.
   ========================================================================= */

export type InquiryRow = {
  id: string;
  kind: "CONTACT" | "REFILL" | "CAREER";
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  isPhi: boolean;
  status: string;
  createdAt: string;
};

const STATUS_TONE: Record<string, Tone> = { NEW: "warn", HANDLED: "good", SPAM: "neutral" };
const KIND_LABEL: Record<InquiryRow["kind"], string> = {
  CONTACT: "Contact",
  REFILL: "Refill",
  CAREER: "Careers",
};

export function InquiryList({ rows }: { rows: InquiryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<Record<string, unknown> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const view = (id: string) =>
    startTransition(async () => {
      const result = await readInquiry(id);
      if (result.ok) {
        setOpen(result.inquiry.payload);
        setOpenId(id);
      }
    });

  return (
    <>
      <DataTable
        head={["Received", "Type", "From", "Status", <span key="actions" className="sr-only">Actions</span>]}
        empty={rows.length === 0 ? "Nothing submitted yet." : undefined}
      >
        {rows.map((row) => (
          <Row key={row.id}>
            <Cell>
              <span className="admin-id">
                {new Date(row.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </Cell>
            <Cell>
              <span className="flex items-center gap-1.5">
                {KIND_LABEL[row.kind]}
                {row.isPhi && (
                  <Pill tone="warn">
                    <ShieldAlert className="mr-0.5 inline size-2.5" strokeWidth={2.6} aria-hidden />
                    PHI
                  </Pill>
                )}
              </span>
            </Cell>
            <Cell>
              {row.isPhi ? (
                <span className="text-[color:var(--admin-ink-50)]">
                  Withheld — open to read
                </span>
              ) : (
                <>
                  <span className="block font-medium">{row.name ?? "—"}</span>
                  <span className="admin-id block text-[color:var(--admin-ink-50)]">
                    {[row.email, row.subject].filter(Boolean).join(" · ")}
                  </span>
                </>
              )}
            </Cell>
            <Cell>
              <Pill tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status.toLowerCase()}</Pill>
            </Cell>
            <Cell>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => view(row.id)}
                  className="inline-flex items-center gap-1 font-medium text-[color:var(--admin-accent)] hover:underline disabled:opacity-50"
                >
                  {pending && openId === row.id ? (
                    <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} aria-hidden />
                  ) : (
                    <Eye className="size-3.5" strokeWidth={2} aria-hidden />
                  )}
                  Open
                </button>
                {row.status !== "HANDLED" && (
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await triageInquiry(row.id, "HANDLED");
                        router.refresh();
                      })
                    }
                    className="text-[color:var(--admin-ink-70)] hover:text-[color:var(--admin-ink)]"
                  >
                    Mark handled
                  </button>
                )}
              </div>
            </Cell>
          </Row>
        ))}
      </DataTable>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Submission"
          onClick={() => setOpen(null)}
        >
          <div
            className="admin-panel max-h-[80vh] w-full max-w-xl overflow-y-auto p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="admin-title text-[0.9375rem]">Submission</h2>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="admin-btn admin-btn-secondary"
              >
                Close
              </button>
            </div>

            <dl className="space-y-2.5">
              {Object.entries(open).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[10rem_1fr] gap-3">
                  <dt className="admin-label">{key.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
                  <dd className="text-[0.8125rem] [overflow-wrap:anywhere]">
                    {key === "resume" && openId && isResume(value) ? (
                      <ResumeField inquiryId={openId} resume={value} />
                    ) : typeof value === "object" && value !== null ? (
                      JSON.stringify(value)
                    ) : (
                      String(value || "—")
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}

type Resume = { name: string; size?: number; key?: string };

const isResume = (value: unknown): value is Resume =>
  typeof value === "object" && value !== null && typeof (value as Resume).name === "string";

/**
 * The attached resume: its name, and a button that fetches a short-lived
 * signed link and opens it. Applications from before resumes were stored have
 * a name but no key, and say so instead of offering a link that cannot work.
 */
function ResumeField({ inquiryId, resume }: { inquiryId: string; resume: Resume }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const size = resume.size ? ` · ${Math.max(1, Math.round(resume.size / 1024))} KB` : "";

  /* The tab is opened inside the click and pointed at the link once it
     arrives. Opening it after the await is no longer a user gesture, and a
     popup blocker swallows it without a word. */
  const openResume = () => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    startTransition(async () => {
      setError(null);
      const result = await inquiryResumeUrl(inquiryId);
      if (result.ok && tab) tab.location.href = result.url;
      else if (result.ok) window.location.href = result.url;
      else {
        tab?.close();
        setError(result.message);
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <span>
        {resume.name}
        <span className="text-ink-muted">{size}</span>
      </span>
      {resume.key ? (
        <button
          type="button"
          onClick={openResume}
          disabled={pending}
          className="admin-btn admin-btn-secondary"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          Open resume
        </button>
      ) : (
        <span className="text-ink-muted">
          Not saved — sent before resumes were stored. Ask the applicant to send it again.
        </span>
      )}
      {error && (
        <span role="alert" className="text-ink-muted">
          {error}
        </span>
      )}
    </div>
  );
}
