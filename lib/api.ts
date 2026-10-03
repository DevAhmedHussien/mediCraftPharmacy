import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthError } from "@/lib/guard";
import { StorageError } from "@/lib/services/storage";
import { InvalidTransitionError, TransitionForbiddenError } from "@/lib/partner/status";

/* ===========================================================================
   One error shape for every route handler: { error: { code, message, details? } }

   Route handlers stay thin by throwing typed errors from the service layer
   and letting `handleRoute` map them. The alternative — a try/catch with its
   own status codes in every handler — is where inconsistent APIs come from,
   and where an internal message eventually leaks to a client.

   Anything unrecognised becomes a generic 500. Stack traces, Prisma error
   text and constraint names stay in the server log: a unique-violation
   message naming a column and a value is an information disclosure.
   ========================================================================= */

export type ApiError = { error: { code: string; message: string; details?: unknown } };

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json<ApiError>({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function handleError(err: unknown): NextResponse<ApiError> {
  if (err instanceof ZodError) {
    // Field-level messages are safe and useful; they describe the request the
    // client just sent, not anything about our data.
    return apiError("VALIDATION_ERROR", "Some fields need attention.", 422, err.flatten().fieldErrors);
  }
  if (err instanceof AuthError) return apiError(err.code, err.message, err.httpStatus);
  if (err instanceof StorageError) return apiError(err.code, err.message, err.httpStatus);
  if (err instanceof InvalidTransitionError) return apiError(err.code, err.message, err.httpStatus);
  if (err instanceof TransitionForbiddenError) return apiError(err.code, err.message, err.httpStatus);

  console.error("[api] unhandled", err);
  return apiError("INTERNAL_ERROR", "Something went wrong on our end.", 500);
}

/** Wrap a handler body so every throw becomes the standard error shape. */
export async function handleRoute<T>(fn: () => Promise<T>): Promise<NextResponse<T | ApiError>> {
  try {
    return NextResponse.json(await fn());
  } catch (err) {
    return handleError(err);
  }
}

/* --- Pagination ---------------------------------------------------------- */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Cursor pagination, not offset.
 *
 * `OFFSET 10000` makes Postgres walk and discard ten thousand rows on every
 * page; a cursor is an index seek whatever the depth. It also cannot skip or
 * repeat a row when something is inserted mid-scroll, which offset can.
 */
export function pageParams(url: URL) {
  const raw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  return { limit, cursor: url.searchParams.get("cursor") ?? undefined };
}

/** Take limit+1 rows, and the extra one tells you there is a next page. */
export function paginate<T extends { id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}
