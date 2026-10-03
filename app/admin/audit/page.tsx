import { ScrollText } from "lucide-react";

import {
  Cell,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  Row,
  type Tone,
} from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/guard";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

/** Colour by consequence, not by entity. */
function actionTone(action: string): Tone {
  if (/reject|suspend|delete|decline/.test(action)) return "bad";
  if (/verified|approve|activate/.test(action)) return "good";
  if (/create|update|hide/.test(action)) return "info";
  return "neutral";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { cursor?: string; entity?: string };
}) {
  await requireAdminPage();

  const entries = await db.auditLog.findMany({
    where: searchParams.entity ? { entityType: searchParams.entity } : undefined,
    orderBy: { createdAt: "desc" },
    // One over the page size: the extra row is how we know there is a next
    // page without a second count query.
    take: PAGE_SIZE + 1,
    ...(searchParams.cursor ? { cursor: { id: searchParams.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      actorEmail: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      ip: true,
      createdAt: true,
    },
  });

  const hasMore = entries.length > PAGE_SIZE;
  const rows = hasMore ? entries.slice(0, PAGE_SIZE) : entries;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Every admin action and every status change, in the order they happened. Rows survive the admin who made them being deleted — the email is denormalised at write time."
      />

      <Panel bodyClassName="p-0">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ScrollText}
              title="Nothing logged yet"
              description="Admin actions appear here as they happen."
            />
          </div>
        ) : (
          <DataTable head={["When", "Who", "Action", "Entity", "Detail"]}>
            {rows.map((entry) => {
              const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
              const detail = Object.entries(metadata)
                .filter(([, value]) => value !== null && value !== "")
                .slice(0, 3)
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(" · ");

              return (
                <Row key={entry.id}>
                  <Cell className="whitespace-nowrap text-[color:var(--admin-ink-70)]">
                    {entry.createdAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Cell>
                  <Cell className="text-[color:var(--admin-ink-70)]">
                    {entry.actorEmail ?? "—"}
                  </Cell>
                  <Cell>
                    <Pill tone={actionTone(entry.action)}>{entry.action}</Pill>
                  </Cell>
                  <Cell mono>{entry.entityType}</Cell>
                  <Cell className="max-w-md truncate text-[color:var(--admin-ink-50)]" title={detail}>
                    {detail || "—"}
                  </Cell>
                </Row>
              );
            })}
          </DataTable>
        )}
      </Panel>

      {hasMore && (
        <div className="flex justify-end">
          <a
            href={`/admin/audit?cursor=${rows[rows.length - 1]!.id}`}
            className="admin-btn admin-btn-secondary"
          >
            Older entries
          </a>
        </div>
      )}
    </div>
  );
}
