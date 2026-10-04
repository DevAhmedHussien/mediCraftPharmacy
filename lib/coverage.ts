/* ===========================================================================
   Licensure status, per state.

   This is the file the pharmacy edits. Brief §4.14 requires the coverage map to
   be "a data-driven SVG the team can update without a designer" — so changing a
   state's status is a one-word edit here, and the map, the legend and the counts
   all follow. Nothing in the component needs touching.

   When Texas comes through: change `TX` from "pursuing" to "licensed". Done.
   ========================================================================= */

/**
 * `licensed`  — a current pharmacy permit is held and the state can be served today.
 * `pursuing`  — licensure is actively in progress. NOT servable yet.
 * `none`      — not currently being pursued.
 *
 * The distinction between the first two is load-bearing: shipping a compounded
 * preparation into a state where the permit is still pending is a licensing
 * violation, not a marketing nuance. The map renders the two differently and the
 * legend spells out that only solid states can be served.
 */
export type LicenceStatus = "licensed" | "pursuing" | "none";

export type StateCell = {
  /** USPS abbreviation. Joins this row to its outline in lib/us-map-shapes.ts. */
  code: string;
  name: string;
  status: LicenceStatus;
};

/**
 * Every state MediCraft tracks, with its licensure status.
 *
 * This list is the source of truth for the map. The geometry lives separately
 * in lib/us-map-shapes.ts (generated from US Census outlines) and is joined to
 * this by `code`, so adding a state here without geometry — or vice versa —
 * simply does not draw, rather than drawing something wrong.
 *
 * DC is included because it licenses separately from Maryland and Virginia.
 */
export const stateGrid: StateCell[] = [
  // Florida is the one state MediCraft can serve today.
  { code: "FL", name: "Florida", status: "licensed" },

  // The 49 remaining states — licensure actively in progress, per the owner's
  // copy ("actively pursuing licensure across all 49 eligible states").
  { code: "AK", name: "Alaska", status: "pursuing" },
  { code: "ME", name: "Maine", status: "pursuing" },

  { code: "VT", name: "Vermont", status: "pursuing" },
  { code: "NH", name: "New Hampshire", status: "pursuing" },

  { code: "WA", name: "Washington", status: "pursuing" },
  { code: "ID", name: "Idaho", status: "pursuing" },
  { code: "MT", name: "Montana", status: "pursuing" },
  { code: "ND", name: "North Dakota", status: "pursuing" },
  { code: "MN", name: "Minnesota", status: "pursuing" },
  { code: "WI", name: "Wisconsin", status: "pursuing" },
  { code: "MI", name: "Michigan", status: "pursuing" },
  { code: "NY", name: "New York", status: "pursuing" },
  { code: "MA", name: "Massachusetts", status: "pursuing" },
  { code: "RI", name: "Rhode Island", status: "pursuing" },

  { code: "OR", name: "Oregon", status: "pursuing" },
  { code: "NV", name: "Nevada", status: "pursuing" },
  { code: "WY", name: "Wyoming", status: "pursuing" },
  { code: "SD", name: "South Dakota", status: "pursuing" },
  { code: "IA", name: "Iowa", status: "pursuing" },
  { code: "IL", name: "Illinois", status: "pursuing" },
  { code: "IN", name: "Indiana", status: "pursuing" },
  { code: "OH", name: "Ohio", status: "pursuing" },
  { code: "PA", name: "Pennsylvania", status: "pursuing" },
  { code: "NJ", name: "New Jersey", status: "pursuing" },
  { code: "CT", name: "Connecticut", status: "pursuing" },

  { code: "CA", name: "California", status: "pursuing" },
  { code: "UT", name: "Utah", status: "pursuing" },
  { code: "CO", name: "Colorado", status: "pursuing" },
  { code: "NE", name: "Nebraska", status: "pursuing" },
  { code: "MO", name: "Missouri", status: "pursuing" },
  { code: "KY", name: "Kentucky", status: "pursuing" },
  { code: "WV", name: "West Virginia", status: "pursuing" },
  { code: "VA", name: "Virginia", status: "pursuing" },
  { code: "MD", name: "Maryland", status: "pursuing" },
  { code: "DE", name: "Delaware", status: "pursuing" },

  { code: "AZ", name: "Arizona", status: "pursuing" },
  { code: "NM", name: "New Mexico", status: "pursuing" },
  { code: "KS", name: "Kansas", status: "pursuing" },
  { code: "AR", name: "Arkansas", status: "pursuing" },
  { code: "TN", name: "Tennessee", status: "pursuing" },
  { code: "NC", name: "North Carolina", status: "pursuing" },
  { code: "SC", name: "South Carolina", status: "pursuing" },

  { code: "HI", name: "Hawaii", status: "pursuing" },
  { code: "OK", name: "Oklahoma", status: "pursuing" },
  { code: "LA", name: "Louisiana", status: "pursuing" },
  { code: "MS", name: "Mississippi", status: "pursuing" },
  { code: "AL", name: "Alabama", status: "pursuing" },
  { code: "GA", name: "Georgia", status: "pursuing" },

  { code: "TX", name: "Texas", status: "pursuing" },

  // The District licenses separately from the states and is not part of the
  // 49-state programme, so it is not claimed as in progress.
  { code: "DC", name: "District of Columbia", status: "none" },
];

/** Counts for the legend and the page copy, derived rather than hand-maintained. */
export function coverageCounts() {
  const licensed = stateGrid.filter((s) => s.status === "licensed");
  const pursuing = stateGrid.filter((s) => s.status === "pursuing");
  return {
    licensed: licensed.length,
    pursuing: pursuing.length,
    licensedNames: licensed.map((s) => s.name),
  };
}
