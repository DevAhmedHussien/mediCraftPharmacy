/* ===========================================================================
   The loader that lets a plain Node script import the app's own services.

   TWO THINGS NEXT DOES FOR FREE THAT tsx DOES NOT.

   1. `.env`. Next reads it; Node does not. Loaded here, before anything
      imports lib/env.ts, which validates on first evaluation and would
      otherwise throw about a missing DATABASE_URL.

   2. `server-only`. That package exists to throw if a server module is ever
      pulled into a client bundle, and it does it by throwing at import time
      unless a bundler has swapped it for a no-op. Outside Next nobody swaps
      it, so importing lib/db.ts from a script throws — which is exactly the
      false positive the package warns about. The package ships its own empty
      module for this; the specifier is pointed at it by absolute path,
      because its `exports` map does not expose the subpath.

   Used by `npm run email:test`. It changes nothing about how the application
   runs — it only makes the application's modules loadable from a script.
   ========================================================================= */
const Module = require("node:module");
const path = require("node:path");

const root = process.cwd();

require(path.join(root, "node_modules/dotenv")).config({ path: path.join(root, ".env") });
require(path.join(root, "node_modules/dotenv")).config({ path: path.join(root, ".env.local") });

const empty = path.join(root, "node_modules/server-only/empty.js");
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return empty;
  return resolveFilename.call(this, request, ...rest);
};
