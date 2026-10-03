"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Search } from "lucide-react";

import { requestAmendmentAction } from "@/app/(site)/portal/products/actions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form/native";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

export type AvailableProduct = {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  category: string | null;
  isQuoteOnly: boolean;
};

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
  const [chosen, setChosen] = useState<string[]>([]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? products.filter((p) =>
          [p.name, p.strength, p.form, p.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : products;
    /* Capped, because the catalogue is 692 items and rendering all of them
       behind an empty search box is a slow page and an unreadable one. The
       count below says what the cap hid, so it never looks like the rest do
       not exist. */
    return pool.slice(0, 60);
  }, [products, query]);

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
    <div className="mt-4 rounded-tile border border-brand-200 bg-brand-50/50 p-6">
      <h3 className="text-[1.0625rem] font-bold text-ink">Request more medications</h3>

      <form action={action} className="mt-4 space-y-5">
        <div>
          <label htmlFor="amendment-search" className="label">
            Choose preparations
          </label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <Input
              id="amendment-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search the formulary…"
              className="pl-9"
            />
          </div>

          <div className="mt-2 max-h-72 overflow-y-auto rounded-tile border border-line bg-white">
            {matches.length === 0 ? (
              <p className="px-4 py-6 text-center text-meta text-ink-muted">
                Nothing matches &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <ul>
                {matches.map((p) => (
                  <li key={p.id} className="border-b border-line last:border-0">
                    <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-sand">
                      <input
                        type="checkbox"
                        name="productIds"
                        value={p.id}
                        checked={chosen.includes(p.id)}
                        onChange={() => toggle(p.id)}
                        className="mt-1 size-4 accent-brand-600"
                      />
                      <span>
                        <span className="block font-bold text-ink">{p.name}</span>
                        <span className="block text-caption text-ink-muted">
                          {[p.strength, p.form, p.category].filter(Boolean).join(" · ")}
                          {p.isQuoteOnly && (
                            <span className="ml-2 rounded bg-sand px-1.5 py-0.5">Quote</span>
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-1.5 text-caption text-ink-muted">
            {chosen.length} selected
            {!query && products.length > matches.length && (
              <> · showing {matches.length} of {products.length} — search to narrow</>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="amendment-notes" className="label">
            What are you looking for?
          </label>
          <textarea
            id="amendment-notes"
            name="requestNotes"
            rows={3}
            required
            minLength={20}
            className="input mt-1.5"
            placeholder="Volumes you expect, which patients these are for, anything that helps us price them."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Send disabled={chosen.length === 0} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-meta text-ink-muted underline"
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
