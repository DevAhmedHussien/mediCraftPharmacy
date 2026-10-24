"use client";

import Link from "next/link";
import { X } from "lucide-react";

/**
 * Server-side filters, as a GET form.
 *
 * These reach the WHOLE table, not just the rows already loaded, which is why
 * they stay on the server while the free-text box lives inside SortableTable.
 * Two search inputs on one screen is a worse problem than one extra click: a
 * user types into whichever they see first and cannot tell why the results
 * differ.
 *
 * A filter applies the moment an option is picked — the form submits itself
 * on change, so there is no "Apply" step to forget. It is still a plain GET
 * form: the server component re-renders, the URL is shareable and
 * back-button-correct, and without JavaScript the visually hidden submit
 * button keeps it working.
 */
export function AdminSearch({
  basePath,
  filters = [],
}: {
  basePath: string;
  filters?: {
    name: string;
    /** Shown to screen readers; defaults to the field name. */
    label?: string;
    value?: string;
    options: { value: string; label: string }[];
  }[];
}) {
  const active = filters.some((filter) => filter.value);

  return (
    <form action={basePath} className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <select
          key={filter.name}
          name={filter.name}
          defaultValue={filter.value ?? ""}
          aria-label={filter.label ?? filter.name}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="admin-input w-auto"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}

      <button type="submit" className="sr-only">
        Apply filters
      </button>

      {active && (
        <Link
          href={basePath}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[0.8125rem] font-medium text-[color:var(--admin-ink-70)] transition-colors hover:text-[color:var(--admin-ink)]"
        >
          <X className="size-3.5" aria-hidden />
          Clear
        </Link>
      )}
    </form>
  );
}
