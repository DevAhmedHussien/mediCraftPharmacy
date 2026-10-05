"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Search, X } from "lucide-react";

import { requestAmendmentAction } from "@/app/portal/products/actions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form/native";
import { fieldClass, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

export type AvailableProduct = {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  category: string | null;
  isQuoteOnly: boolean;
};

const ALL = "__all__";

/**
 * Raise a hand: ask for preparations to be added to the schedule.
 *
 * Collapsed until asked for. A verified partner opens this page to look at
 * what they already order; a permanently-expanded request form would make the
 * page about selling them more, which is our interest rather than theirs.
 *
 * CHOSEN FROM THE CATALOGUE, NOT TYPED. An earlier draft took free text, and
 * it put the burden of matching "tirzepatide 10mg" to a catalogue row on
 * whichever admin picked the request up — which is both the slowest and the
 * easiest place to get a strength wrong. Checkboxes over the real catalogue
 * mean the request arrives as product ids and the price list can be drafted
 * straight from it.
 *
 * Items already on the partner's schedule are not in `products` at all. The
 * server rejects them too, because a form can be posted with anything in it,
 * but keeping them off the list means nobody has to read the rejection.
 */
export function AmendmentRequest({ products }: { products: AvailableProduct[] }) {
  const [state, action] = useFormState(requestAmendmentAction, initialFormState);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [chosen, setChosen] = useState<string[]>([]);

  /* Only categories that actually have something to offer this partner.
     The catalogue has nineteen; ten hold stock, and the rest would be dead
     options that return an empty list — a filter that can produce nothing is
     a filter nobody trusts a second time. */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.category) continue;
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== ALL && p.category !== category) return false;
      if (!q) return true;
      return [p.name, p.strength, p.form, p.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [products, query, category]);

  /* The chosen rows, resolved to products, so the summary can name them even
     when the current filter hides them. */
  const chosenProducts = useMemo(
    () => chosen.map((id) => products.find((p) => p.id === id)).filter(Boolean) as AvailableProduct[],
    [chosen, products]
  );

  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    );

  if (!open) {
    return (
      <div className="mt-4 rounded-tile border border-line bg-sand p-6">
        <p className="text-body text-ink">
          Want to add preparations to your schedule? Tell us which, and we will price them
          and send a change order to sign. Everything already on your schedule keeps running
          in the meantime.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          Request more medications
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-tile border border-line bg-white">
      <div className="border-b border-line bg-sand px-6 py-4">
        <h3 className="text-[1.0625rem] font-bold text-ink">Request more medications</h3>
        <p className="mt-0.5 text-caption text-ink-muted">
          Pick what you want added. We price those and send a change order to sign.
        </p>
      </div>

      <form action={action} className="space-y-6 p-6">
        {/* ---- THE SELECTION, POSTED INDEPENDENTLY OF WHAT IS ON SCREEN ----
            These hidden inputs are the form's actual answer, and they are the
            fix for a real bug: the checkboxes used to carry `name="productIds"`
            themselves, so a product selected and then filtered out of view was
            unmounted, its input left the DOM, and the request posted without
            it. Tick three things in Weight Management, switch to HRT, submit,
            and the first three were silently gone. Adding a category filter
            would have turned that from an edge case into the normal path.

            The checkboxes below are now display only. What gets submitted is
            `chosen`, in full, regardless of filter. */}
        {chosen.map((id) => (
          <input key={id} type="hidden" name="productIds" value={id} />
        ))}

        <div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="amendment-search">Choose preparations</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden
                />
                <Input
                  id="amendment-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  placeholder="Search by name, strength or form…"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="min-w-[11rem]">
              <Label htmlFor="amendment-category">Category</Label>
              <select
                id="amendment-category"
                value={category}
                onChange={(e) => setCategory(e.currentTarget.value)}
                className={cn(fieldClass, "mt-1.5")}
              >
                <option value={ALL}>All categories ({products.length})</option>
                {categories.map(([name, count]) => (
                  <option key={name} value={name}>
                    {name} ({count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 max-h-[26rem] overflow-y-auto rounded-tile border border-line">
            {matches.length === 0 ? (
              <p className="px-4 py-10 text-center text-meta text-ink-muted">
                Nothing here matches that.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => {
                    setQuery("");
                    setCategory(ALL);
                  }}
                >
                  Clear the filters
                </button>
                .
              </p>
            ) : (
              <ul>
                {matches.map((p) => {
                  const picked = chosen.includes(p.id);
                  return (
                    <li key={p.id} className="border-b border-line last:border-0">
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                          picked ? "bg-brand-50" : "hover:bg-sand"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={() => toggle(p.id)}
                          className="mt-0.5 size-4 shrink-0 accent-brand-600"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-semibold text-ink">{p.name}</span>
                            {p.strength && (
                              <span className="font-mono text-caption text-ink-soft">
                                {p.strength}
                              </span>
                            )}
                            {p.isQuoteOnly && (
                              <span className="rounded-full border border-line px-1.5 py-px text-[0.6875rem] font-semibold text-ink-muted">
                                Quote
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-caption text-ink-muted">
                            {[p.form, p.category].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="mt-2 text-caption text-ink-muted">
            Showing {matches.length} of {products.length} available
            {category !== ALL && <> in {category}</>}
          </p>
        </div>

        {/* The selection, named. Without this a partner filtering across four
            categories has no way to see what they have already picked, and the
            count alone ("7 selected") is not an answer to "which seven?". */}
        {chosenProducts.length > 0 && (
          <div className="rounded-tile border border-brand-200 bg-brand-50/60 p-4">
            <p className="text-meta font-bold text-ink">
              {chosenProducts.length} selected
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {chosenProducts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white py-1 pl-3 pr-2 text-caption text-ink transition-colors hover:border-brand-400"
                  >
                    {p.name}
                    {p.strength && <span className="text-ink-muted">{p.strength}</span>}
                    <X className="size-3 text-ink-muted" aria-hidden />
                    <span className="sr-only">Remove {p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <Label htmlFor="amendment-notes">What are you looking for?</Label>
          <textarea
            id="amendment-notes"
            name="requestNotes"
            rows={3}
            required
            minLength={20}
            className={cn(fieldClass, "mt-1.5")}
            placeholder="Volumes you expect, which patients these are for, anything that helps us price them."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Send disabled={chosen.length === 0} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-meta text-ink-muted underline underline-offset-2"
          >
            Cancel
          </button>
        </div>

        <FormAlert ok={state.ok} message={state.message} />
      </form>
    </div>
  );
}

function Send({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Sending…" : "Send request"} <span aria-hidden>→</span>
    </Button>
  );
}
