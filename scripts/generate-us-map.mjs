import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoPath, geoAlbersUsa } from 'd3-geo';

const raw = JSON.parse(readFileSync('node_modules/us-atlas/states-10m.json','utf8'));

/* Drop vertices before projecting.
   The 10m source carries coastline detail meant for a wall-sized map; at the
   size this renders it is invisible and costs ~100KB. Visvalingam simplification
   removes the lowest-weight points first, so the silhouette of each state — the
   only thing a reader identifies it by — survives while the noise goes.

   0.06 keeps the recognisable notches (Cape Cod, the Chesapeake, the Florida
   keys) and discards the rest. Raise it and Michigan starts losing its mitten. */
const pre = presimplify(raw);
const topo = simplify(pre, quantile(pre, 0.06));
const states = feature(topo, topo.objects.states);

// Albers USA: the standard projection for a 50-state map — it insets Alaska
// and Hawaii so they are visible without the Aleutians dragging the frame.
const W = 960, H = 600;
const proj = geoAlbersUsa().fitExtent([[12,12],[W-12,H-12]], states);
/* One decimal place. On a 960x600 viewBox that is a tenth of a pixel — far
   finer than anything a screen renders — and it cuts the generated file from
   ~217KB to ~70KB. This geometry ships inside the page, so the saving is real
   bytes on every licences page view. */
const path = geoPath(proj).digits(1);

// FIPS -> postal code, so the component can join geometry to lib/coverage.ts.
const FIPS = {"01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"};

const rows = [];
for (const f of states.features) {
  const code = FIPS[f.id];
  if (!code) continue;                       // territories: not served, not drawn
  const d = path(f);
  if (!d) continue;
  const c = path.centroid(f);
  rows.push({ code, name: f.properties.name, d,
              cx: Math.round(c[0]*10)/10, cy: Math.round(c[1]*10)/10 });
}
rows.sort((a,b)=>a.code.localeCompare(b.code));

const out = `/* GENERATED FILE — do not edit by hand.
 *
 * US state outlines, already projected to a ${W}x${H} viewBox so the browser
 * ships no projection code and no TopoJSON. Regenerate with:
 *
 *   node scripts/generate-us-map.mjs
 *
 * Source: us-atlas states-10m (US Census Bureau), projected with
 * d3-geo's geoAlbersUsa, which insets Alaska and Hawaii.
 *
 * \`cx\`/\`cy\` are each state's centroid, used to place its label.
 */

export const US_MAP_VIEWBOX = "0 0 ${W} ${H}";

export type StateShape = {
  /** Postal code — joins to lib/coverage.ts. */
  code: string;
  name: string;
  /** SVG path data. */
  d: string;
  cx: number;
  cy: number;
};

export const US_STATE_SHAPES: StateShape[] = ${JSON.stringify(rows, null, 0).replace(/\},\{/g, '},\n  {').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')};
`;
writeFileSync('lib/us-map-shapes.ts', out);
console.log('states written:', rows.length);
console.log('file KB:', Math.round(out.length/1024));
