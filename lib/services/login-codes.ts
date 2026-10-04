import "server-only";

import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

/* ===========================================================================
   Sign in with a code, instead of a password.

   WHAT IT IS FOR
   --------------
   A practice manager signs in a handful of times a year. They do not have the
   password in a manager and they do not remember it, so the real flow today
   is "forgot password" every time — a reset link, a new password, and a
   second credential nobody will remember either. A code sent to the address
   on the account does the same job in one step and leaves nothing behind.

   IT IS NOT WEAKER THAN THE PASSWORD IT REPLACES. Both paths end at "can you
   read this inbox": a password can be reset from it. The code just stops
   pretending otherwise. What it must not be is weaker than that, hence:

     · SIX DIGITS, from `randomInt` — the CSPRNG, not `Math.random`.
     · TEN MINUTES. Long enough for an email to arrive and be read on a
       phone, short enough that a code sitting in a mailbox is not a key.
     · FIVE GUESSES per code, then the code is burned. A million-space secret
       with unlimited guesses is a four-digit PIN with extra steps.
     · ONE LIVE CODE per address. Asking for a second invalidates the first,
       so a thread of old emails is not a ring of working keys.
     · HASHED AT REST, with bcrypt at the same cost as a password. The
       plaintext exists in the email and nowhere else.
     · CONSUMED ON USE, inside the same update that checks it.

   WHAT IT DELIBERATELY DOES NOT DO
   --------------------------------
   Tell the caller whether the address has an account. `issueLoginCode`
   returns the same thing for a real partner, a former employee and a
   stranger — the login form must not answer "do you work with this
   practice?" to anyone with a list of addresses.
   ========================================================================= */

/** How long a code is good for. */
const TTL_MS = 10 * 60 * 1000;

/** Wrong guesses allowed against one code before it is dead. */
const MAX_ATTEMPTS = 5;

/** Six digits, zero-padded, from the CSPRNG. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Issue a code for this address, if it belongs to an active account.
 *
 * Returns the plaintext code when one was issued and `null` when it was not —
 * the CALLER emails it. Nothing else ever sees it, and it is never logged.
 *
 * A caller must not vary its response on the return value. The one in
 * app/login/actions.ts says the same sentence either way.
 */
export async function issueLoginCode(
  email: string
): Promise<{ code: string; name: string } | null> {
  const address = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: address },
    select: { isActive: true, name: true },
  });

  // No account, or a switched-off one. The caller still says "check your
  // inbox" — see the note above.
  if (!user?.isActive) return null;

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 12);

  await db.$transaction([
    /* Supersede anything still live for this address. Two valid codes in one
       inbox is two keys, and the older one is the one an attacker who saw a
       screen over a shoulder five minutes ago still has. */
    db.loginCode.updateMany({
      where: { email: address, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    }),
    db.loginCode.create({
      data: { email: address, codeHash, expiresAt: new Date(Date.now() + TTL_MS) },
    }),
  ]);

  return { code, name: user.name };
}

/**
 * Check a code and consume it.
 *
 * True exactly once per issued code. Every other outcome — no code, expired,
 * wrong digits, already used, out of guesses — is false, with no distinction
 * offered to the caller: "that code has expired" and "that code is wrong" are
 * the same sentence on screen, because the difference is only useful to
 * somebody guessing.
 */
export async function consumeLoginCode(email: string, code: string): Promise<boolean> {
  const address = email.trim().toLowerCase();
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return false;

  const record = await db.loginCode.findFirst({
    where: { email: address, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, codeHash: true, attempts: true },
  });

  /* Still run a hash when there is no record, for the same reason
     lib/auth.ts compares against a dummy: an address with no live code must
     not answer faster than one that has one. */
  if (!record) {
    await bcrypt.compare(digits, "$2b$12$C6UzMDM.H6dfI/f/IKcEeO1eQ0Gu0Q7dFqZ3QqjxZcZ5rQ7bW1lJ2");
    return false;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await db.loginCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return false;
  }

  const ok = await bcrypt.compare(digits, record.codeHash);

  if (!ok) {
    await db.loginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  /* Consume on the way out, conditionally. `updateMany` with
     `consumedAt: null` in the WHERE makes this a compare-and-swap: two
     requests racing the same code produce one update and one no-op, so a
     replayed submit cannot mint a second session. */
  const consumed = await db.loginCode.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  return consumed.count === 1;
}

/**
 * Drop codes that are long dead.
 *
 * Nothing depends on this running — every read already filters on `expiresAt`
 * and `consumedAt`. It exists so the table does not grow forever, and it is
 * safe to call from any scheduled job.
 */
export async function purgeExpiredLoginCodes(olderThanDays = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 864e5);
  const { count } = await db.loginCode.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return count;
}
