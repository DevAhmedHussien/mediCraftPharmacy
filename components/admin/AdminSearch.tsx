"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

/**
 * Server-side filters.
 *
 * These reach the WHOLE table, not just the rows already loaded, which is why
 * they stay on the server while the free-text box lives inside SortableTable.
 * Two search inputs on one screen is a worse problem than one extra click: a
 * user types into whichever they see first and cannot tell why the results
 * differ.
 *
 * A filter applies the moment an option is picked, as a client-side
 * navigation: the router fetches the re-rendered page and swaps it in, so the
 * shell, the scroll position and the other controls stay put. Submitting the
 * form natively did a full document load on every change — the whole console
 * blanked and repainted to change one dropdown. Empty values are dropped so
 * the URL stays clean, and it is still shareable and back-button-correct.
 * Without JavaScript the form and its visually hidden submit still work.
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = filters.some((filter) => filter.value);

  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (typeof value === "string" && value) params.set(key, value);
    });
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    });
  }

  return (
    <form
      /* Remount when the URL's filters change (Clear, back/forward), so the
         uncontrolled selects show the values the page was rendered with. */
      key={filters.map((filter) => filter.value ?? "").join("|")}
      action={basePath}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
      aria-busy={pending || undefined}
      className="flex flex-wrap items-center gap-1.5"
    >
      {pending && (
        <Loader2
          className="size-4 animate-spin text-[color:var(--admin-ink-50)]"
          aria-hidden
        />
      )}

      {filters.map((filter) => (
        <select
          key={filter.name}
          name={filter.name}
          defaultValue={filter.value ?? ""}
          aria-label={filter.label ?? filter.name}
          onChange={(event) => apply(event.currentTarget.form!)}
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
          scroll={false}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[0.8125rem] font-medium text-[color:var(--admin-ink-70)] transition-colors hover:text-[color:var(--admin-ink)]"
        >
          <X className="size-3.5" aria-hidden />
          Clear
        </Link>
      )}
    </form>
  );
}
