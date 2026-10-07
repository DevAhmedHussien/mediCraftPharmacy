"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { SortableTable } from "@/components/admin/SortableTable";
import { ADMIN_ACTIONABLE_STATUSES, type PartnerStatus } from "@/lib/partner/status";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

export type PartnerRow = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  state: string | null;
  status: PartnerStatus;
  statusChangedAt: string;
};

/** Days a partner has sat in its current status. */
function waitingDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
}

export function PartnersTable({ rows }: { rows: PartnerRow[] }) {
  const columns = useMemo<ColumnDef<PartnerRow>[]>(
    () => [
      {
        accessorKey: "companyName",
        header: "Practice",
        cell: ({ row }) => (
          <>
            <Link
              href={`/admin/partners/${row.original.id}`}
              className="font-medium transition-colors hover:text-[color:var(--admin-accent)]"
            >
              {row.original.companyName}
            </Link>
            <p className="mt-0.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">
              {row.original.contactName} · {row.original.email}
            </p>
          </>
        ),
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ getValue }) => <span className="text-[color:var(--admin-ink-70)]">{String(getValue() ?? "—")}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          return <StatusBadge kind="partner" status={String(getValue())} />;
        },
      },
      {
        accessorKey: "statusChangedAt",
        header: "Waiting",
        meta: { align: "right" },
        cell: ({ row }) => {
          const days = waitingDays(row.original.statusChangedAt);
          const stale =
            days >= 2 && ADMIN_ACTIONABLE_STATUSES.includes(row.original.status);
          return (
            <span className={cn("font-mono tabular-nums", stale ? "font-bold text-warning-fg" : "text-ink-soft")}>
              {days === 0 ? "today" : `${days}d`}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <Link
            href={`/admin/partners/${row.original.id}`}
            className="font-medium text-[color:var(--admin-accent)] hover:underline"
          >
            Review
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <SortableTable
      data={rows}
      columns={columns}
      searchPlaceholder="Filter by practice, contact or email…"
      emptyMessage="No partners in this status."
      initialSort={[{ id: "statusChangedAt", desc: false }]}
    />
  );
}
