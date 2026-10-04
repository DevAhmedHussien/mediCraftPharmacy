import type { Role } from "@prisma/client";
import { statusEntry } from "@/components/admin/StatusBadge";

import { Panel } from "@/components/admin/ui";

/**
 * The audit trail, as a timeline.
 *
 * Reads from StatusHistory rather than reconstructing from the current
 * status, so it shows what actually happened — including rounds of changes
 * requested and resubmitted, which a status field alone erases.
 */
export function StatusTimeline({
  entries,
}: {
  entries: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actorEmail: string | null;
    actorRole: Role | null;
    note: string | null;
    createdAt: string;
  }[];
}) {
  return (
    <Panel title="History" className="h-fit">
      {entries.length === 0 ? (
        <p className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">Nothing recorded yet.</p>
      ) : (
        <ol>
          {entries.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < entries.length - 1 && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[0.28125rem] top-4 w-px"
                  style={{ background: "var(--admin-border-strong)" }}
                />
              )}
              <span
                aria-hidden
                className="relative mt-1.5 block size-[0.5625rem] shrink-0 rounded-full border-2 bg-white"
                style={{ borderColor: "var(--admin-accent)" }}
              />
              <div className="min-w-0">
                {/* The event in the same words the rest of the console uses
                    for it, rather than the enum member set in monospace. A
                    history is read by people asking what happened, and
                    MSA_SIGNED is not an answer to that. */}
                <p className="text-[0.8125rem] font-semibold text-[color:var(--admin-ink)]">
                  {statusEntry("partner", entry.toStatus).label}
                </p>
                <p className="mt-0.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">
                  {new Date(entry.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {entry.actorEmail && ` · ${entry.actorEmail}`}
                </p>
                {entry.note && (
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]">
                    {entry.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
