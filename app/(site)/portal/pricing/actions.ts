"use server";

import { revalidatePath } from "next/cache";

import { requireOwnPartner } from "@/lib/guard";
import {
  clearSelection,
  setSelected,
  setSelectedForQuery,
  type FormularyQuery,
} from "@/lib/services/formulary";

/* ===========================================================================
   Choosing which medications a practice works with.

   Every one of these resolves the partner from the session — a payload names a
   product, never a partner. Writing straight to the database on each tick
   rather than batching on submit is what lets the selection survive paging,
   searching and closing the tab, which is the whole reason it is not
   component state.
   ========================================================================= */

export async function toggleProductSelection(productId: string, selected: boolean) {
  const { partnerId } = await requireOwnPartner();
  await setSelected(partnerId, productId, selected);
  revalidatePath("/portal/pricing");
  return { ok: true as const };
}

export async function selectAllMatching(query: FormularyQuery, selected: boolean) {
  const { partnerId } = await requireOwnPartner();
  const affected = await setSelectedForQuery(partnerId, query, selected);
  revalidatePath("/portal/pricing");
  return { ok: true as const, affected };
}

export async function clearAllSelected() {
  const { partnerId } = await requireOwnPartner();
  await clearSelection(partnerId);
  revalidatePath("/portal/pricing");
  return { ok: true as const };
}
