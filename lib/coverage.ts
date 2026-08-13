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
  /** USPS abbreviation — also the SVG label. */
  code: string;
  name: string;
  /** Position in the tile cartogram: row (north→south), col (west→east). */
  row: number;
  col: number;
  status: LicenceStatus;
};

/**
 * A tile cartogram rather than true geography: every state is an equal square
 * laid out in roughly its national position.
 *
 * Chosen deliberately over an outline map. At the sizes this renders — a panel
 * beside body copy — Rhode Island and Delaware are a few pixels on a real
 * outline map and their labels do not fit, which is exactly the information a
 * licensure map exists to convey. Equal tiles make every state equally legible
 * and equally labelled, and the grid stays readable down to a phone.
 *
 * Grid is 12 columns x 8 rows. Alaska and Hawaii sit at the left edge, as is
 * conventional; DC is included as its own tile because it licenses separately.
 */
export const stateGrid: StateCell[] = [
  // Florida is the one state MediCraft can serve today.
  { code: "FL", name: "Florida", row: 7, col: 9, status: "licensed" },

  // The 49 remaining states — licensure actively in progress, per the owner's
  // copy ("actively pursuing licensure across all 49 eligible states").
  { code: "AK", name: "Alaska", row: 0, col: 0, status: "pursuing" },
  { code: "ME", name: "Maine", row: 0, col: 11, status: "pursuing" },

  { code: "VT", name: "Vermont", row: 1, col: 9, status: "pursuing" },
  { code: "NH", name: "New Hampshire", row: 1, col: 10, status: "pursuing" },

  { code: "WA", name: "Washington", row: 2, col: 1, status: "pursuing" },
  { code: "ID", name: "Idaho", row: 2, col: 2, status: "pursuing" },
  { code: "MT", name: "Montana", row: 2, col: 3, status: "pursuing" },
  { code: "ND", name: "North Dakota", row: 2, col: 4, status: "pursuing" },
  { code: "MN", name: "Minnesota", row: 2, col: 5, status: "pursuing" },
  { code: "WI", name: "Wisconsin", row: 2, col: 6, status: "pursuing" },
  { code: "MI", name: "Michigan", row: 2, col: 7, status: "pursuing" },
  { code: "NY", name: "New York", row: 2, col: 9, status: "pursuing" },
  { code: "MA", name: "Massachusetts", row: 2, col: 10, status: "pursuing" },
  { code: "RI", name: "Rhode Island", row: 2, col: 11, status: "pursuing" },

  { code: "OR", name: "Oregon", row: 3, col: 1, status: "pursuing" },
  { code: "NV", name: "Nevada", row: 3, col: 2, status: "pursuing" },
  { code: "WY", name: "Wyoming", row: 3, col: 3, status: "pursuing" },
  { code: "SD", name: "South Dakota", row: 3, col: 4, status: "pursuing" },
  { code: "IA", name: "Iowa", row: 3, col: 5, status: "pursuing" },
  { code: "IL", name: "Illinois", row: 3, col: 6, status: "pursuing" },
  { code: "IN", name: "Indiana", row: 3, col: 7, status: "pursuing" },
  { code: "OH", name: "Ohio", row: 3, col: 8, status: "pursuing" },
  { code: "PA", name: "Pennsylvania", row: 3, col: 9, status: "pursuing" },
  { code: "NJ", name: "New Jersey", row: 3, col: 10, status: "pursuing" },
  { code: "CT", name: "Connecticut", row: 3, col: 11, status: "pursuing" },

  { code: "CA", name: "California", row: 4, col: 1, status: "pursuing" },
  { code: "UT", name: "Utah", row: 4, col: 2, status: "pursuing" },
  { code: "CO", name: "Colorado", row: 4, col: 3, status: "pursuing" },
  { code: "NE", name: "Nebraska", row: 4, col: 4, status: "pursuing" },
  { code: "MO", name: "Missouri", row: 4, col: 5, status: "pursuing" },
  { code: "KY", name: "Kentucky", row: 4, col: 6, status: "pursuing" },
  { code: "WV", name: "West Virginia", row: 4, col: 7, status: "pursuing" },
  { code: "VA", name: "Virginia", row: 4, col: 8, status: "pursuing" },
  { code: "MD", name: "Maryland", row: 4, col: 9, status: "pursuing" },
  { code: "DE", name: "Delaware", row: 4, col: 10, status: "pursuing" },

  { code: "AZ", name: "Arizona", row: 5, col: 2, status: "pursuing" },
  { code: "NM", name: "New Mexico", row: 5, col: 3, status: "pursuing" },
  { code: "KS", name: "Kansas", row: 5, col: 4, status: "pursuing" },
  { code: "AR", name: "Arkansas", row: 5, col: 5, status: "pursuing" },
  { code: "TN", name: "Tennessee", row: 5, col: 6, status: "pursuing" },
  { code: "NC", name: "North Carolina", row: 5, col: 7, status: "pursuing" },
  { code: "SC", name: "South Carolina", row: 5, col: 8, status: "pursuing" },

  { code: "HI", name: "Hawaii", row: 6, col: 0, status: "pursuing" },
  { code: "OK", name: "Oklahoma", row: 6, col: 4, status: "pursuing" },
  { code: "LA", name: "Louisiana", row: 6, col: 5, status: "pursuing" },
  { code: "MS", name: "Mississippi", row: 6, col: 6, status: "pursuing" },
  { code: "AL", name: "Alabama", row: 6, col: 7, status: "pursuing" },
  { code: "GA", name: "Georgia", row: 6, col: 8, status: "pursuing" },

  { code: "TX", name: "Texas", row: 7, col: 4, status: "pursuing" },

  // The District licenses separately from the states and is not part of the
  // 49-state programme, so it is not claimed as in progress.
  { code: "DC", name: "District of Columbia", row: 5, col: 9, status: "none" },
];

export const GRID_COLS = 12;
export const GRID_ROWS = 8;

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
