"use client";

import { useFormState, useFormStatus } from "react-dom";

import { acceptAmendmentPricingAction } from "@/app/(site)/portal/products/actions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form/native";
import { initialFormState } from "@/lib/forms";

type Amendment = {
  id: string;
  number: number;
  status: string;
  requestNotes: string;
  requestedAt: string;
  adminNote: string | null;
  items: { product: { id: string; name: string; strength: string | null } }[];
};

/**
 * Where an open change request has got to, in the partner's words.
 *
 * Exhaustive over the statuses a partner can see. DECLINED and SIGNED are not
 * here on purpose — they are settled, so they belong in the history list
 * rather than in a card that implies something is still happening.
 */
const EXPLANATION: Record<string, string> = {
  REQUESTED: "We have your request. Someone will price these and come back to you.",
  UNDER_REVIEW: "We are pricing these for you now.",
  PRICING_SENT: "Your pricing for these items is ready. Accept it and we will send the change order to sign.",
  CHANGES_REQUESTED: "You asked for another look. We are revising these prices.",
  ACCEPTED: "Pricing agreed. Your change order is being prepared.",
  CHANGE_ORDER_SENT: "Your change order is ready to sign. These items go live the moment it is signed.",
};

export function AmendmentStatusCard({ amendment }: { amendment: Amendment }) {
  const [state, action] = useFormState(
    acceptAmendmentPricingAction.bind(null, amendment.id),
    initialFormState
  );

  return (
    <div className="mt-4 rounded-tile border border-brand-200 bg-brand-50/50 p-6">
      <p className="eyebrow">Change order {amendment.number}</p>
      <p className="mt-2 text-body text-ink">
        {EXPLANATION[amendment.status] ?? "This request is in progress."}
      </p>

      <ul className="mt-4 space-y-1">
        {amendment.items.map(({ product }) => (
          <li key={product.id} className="text-meta text-ink-soft">
            {product.name}
            {product.strength ? ` · ${product.strength}` : ""}
          </li>
        ))}
      </ul>

      {amendment.adminNote && (
        <p className="mt-4 rounded-tile border border-line bg-white px-4 py-3 text-meta text-ink-soft">
          {amendment.adminNote}
        </p>
      )}

      {amendment.status === "PRICING_SENT" && (
        <form action={action} className="mt-5 space-y-3">
          <p className="text-meta text-ink-soft">
            Your prices for these items are on your pricing page. Accepting here agrees them
            and starts the change order.
          </p>
          <Accept />
          <FormAlert ok={state.ok} message={state.message} />
        </form>
      )}

      {amendment.status === "CHANGE_ORDER_SENT" && (
        <p className="mt-5">
          <a href="/portal/agreement" className="link-arrow font-semibold">
            Review and sign the change order
          </a>
        </p>
      )}
    </div>
  );
}

function Accept() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Accepting…" : "Accept these prices"} <span aria-hidden>→</span>
    </Button>
  );
}
