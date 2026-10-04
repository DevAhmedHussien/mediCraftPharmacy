import "server-only";

/* ===========================================================================
   Prerendering a database-backed route when there may be no database.

   `generateStaticParams` runs at build time. Locally and in CI that is fine —
   Postgres is up and every product page is prerendered. Inside `docker build`
   it is not: the build stage has no network to a database and no business
   having one, because an image that can only be produced next to a live
   database cannot be built from a clean checkout.

   So the build degrades rather than fails: with no database reachable, no
   paths are prerendered and the routes render on demand instead. The pages are
   identical either way; only the timing of the first render changes.

   WHAT THIS DELIBERATELY DOES NOT SWALLOW
   ---------------------------------------
   Only the handful of Prisma errors that mean "there is nothing to talk to".
   A malformed query, a missing column, a type error — anything that indicates
   the code is wrong rather than the environment is empty — is rethrown and
   fails the build. Catching everything here would turn a broken query into a
   site that silently builds with zero product pages, which is the failure
   nobody notices until a crawler does.
   ========================================================================= */

/**
 * Prisma error codes that mean the server could not be reached or opened.
 *
 * P1000 authentication failed · P1001 cannot reach the server
 * P1002 timed out · P1003 the database does not exist
 * P1017 the server closed the connection
 */
const UNREACHABLE_PRISMA_CODES = new Set(["P1000", "P1001", "P1002", "P1003", "P1017"]);

/** Socket-level refusals, for the adapter path that never reaches Prisma. */
const UNREACHABLE_SYSCALLS = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"]);

function isDatabaseUnreachable(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string") {
    if (UNREACHABLE_PRISMA_CODES.has(code)) return true;
    if (UNREACHABLE_SYSCALLS.has(code)) return true;
  }

  /* The driver-adapter path does not carry a P-code.
   *
   * lib/db.ts drives Postgres through @prisma/adapter-pg, and a refused
   * connection there surfaces as a DriverAdapterError named
   * "DatabaseNotReachable" wrapped in a PrismaClientKnownRequestError — no
   * P1001 anywhere in it. Matching on the name rather than the message keeps
   * this from depending on wording Prisma is free to change. */
  const name = (error as { name?: unknown })?.name;
  const adapterError = (error as { driverAdapterError?: unknown })?.driverAdapterError;
  if (adapterError) return isDatabaseUnreachable(adapterError);
  if (typeof name === "string" && name === "DatabaseNotReachable") return true;
  if (typeof (error as { message?: unknown })?.message === "string"
      && /DatabaseNotReachable/.test((error as { message: string }).message)) {
    return true;
  }

  // node-postgres wraps the original in `cause` when pooling.
  const cause = (error as { cause?: unknown })?.cause;
  return cause ? isDatabaseUnreachable(cause) : false;
}

/**
 * Run a `generateStaticParams` body, or prerender nothing if there is no
 * database to read.
 *
 * @param route  Named only so the build log says which route went dynamic.
 */
export async function prerenderFromDb<T>(
  route: string,
  load: () => Promise<T[]>
): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error;

    // Loud on purpose. A build that quietly prerenders nothing looks the same
    // as a build that had nothing to prerender.
    console.warn(
      `[build] no database reachable — ${route} will render on demand instead of being prerendered.`
    );
    return [];
  }
}
