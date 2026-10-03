import { TableSkeleton } from "@/components/admin/ui";

/**
 * Route-level loading UI.
 *
 * A skeleton the shape of the table that is coming, rather than a spinner: it
 * reserves the layout so nothing jumps when the data lands, and it tells the
 * operator which screen they are on while it loads.
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="mb-5 space-y-2">
        <div className="h-5 w-40 animate-pulse rounded bg-[color:var(--admin-border)]" />
        <div className="h-3 w-72 animate-pulse rounded bg-[color:var(--admin-border)]" />
      </div>
      <TableSkeleton />
    </div>
  );
}
