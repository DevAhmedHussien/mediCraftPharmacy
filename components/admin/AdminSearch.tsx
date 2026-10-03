/**
 * Server-side filters, as a GET form.
 *
 * These reach the WHOLE table, not just the rows already loaded, which is why
 * they stay on the server while the free-text box lives inside SortableTable.
 * Two search inputs on one screen is a worse problem than one extra click: a
 * user types into whichever they see first and cannot tell why the results
 * differ.
 *
 * No client state and no debounced fetch — the form submits to the same route
 * with query parameters, the server component re-renders, and the URL is
 * shareable and back-button-correct.
 */
export function AdminSearch({
  basePath,
  filters = [],
}: {
  basePath: string;
  filters?: { name: string; value?: string; options: { value: string; label: string }[] }[];
}) {
  return (
    <form action={basePath} className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <select
          key={filter.name}
          name={filter.name}
          defaultValue={filter.value ?? ""}
          aria-label={filter.name}
          className="admin-input w-auto"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}

      <button type="submit" className="admin-btn admin-btn-secondary">
        Apply
      </button>
    </form>
  );
}
