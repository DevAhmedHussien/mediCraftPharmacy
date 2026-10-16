import "server-only";

import { createHmac } from "node:crypto";

import {
  decryptField as decryptWithKey,
  encryptField as encryptWithKey,
  last4,
  sealField as sealWithKey,
  toKey,
} from "@/lib/encryption";
import { env } from "@/lib/env";

/* ===========================================================================
   Field-level encryption for regulated identifiers, bound to this app's key.

   DEA numbers, NPIs, state licence numbers and EINs are the fields that make
   a leaked database table worth something to somebody. They are stored as an
   AES-256-GCM envelope and never as plaintext, never in a log line, and never
   in an email.

   The algorithm lives in lib/encryption.ts, which takes the key as an
   argument and carries no `server-only` guard so a seed or a test can use it.
   This file is the only place the key is read from the environment — which is
   why the guard belongs here and not there.
   ========================================================================= */

const KEY = toKey(env.FIELD_ENCRYPTION_KEY);

export const encryptField = (plaintext: string) => encryptWithKey(plaintext, KEY);
export const decryptField = (envelope: string) => decryptWithKey(envelope, KEY);
export const sealField = (plaintext: string) => sealWithKey(plaintext, KEY);

export { last4 };

/* --- Hashing (one-way, not encryption) ----------------------------------- */

/**
 * Stable per-visitor key for analytics, unlinkable after the salt rotates.
 *
 * The salt carries the UTC date, so the same visitor hashes the same way all
 * day and differently tomorrow. That is exactly enough to count unique
 * visitors per day and not enough to follow anyone across days — which is why
 * no IP address is stored and no cookie is set.
 */
export function visitorHash(ip: string, userAgent: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return createHmac("sha256", `${env.ANALYTICS_SALT}:${day}`).update(`${ip}|${userAgent}`).digest("base64url");
}

