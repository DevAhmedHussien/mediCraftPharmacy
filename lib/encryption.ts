import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/* ===========================================================================
   Field encryption — the algorithm, with the key passed in.

   Deliberately free of `server-only` and of `lib/env`, so it can be used from
   a seed script, a migration, or a unit test. The key never has a default and
   is never read from the environment here: `lib/crypto.ts` is the server-side
   wrapper that binds it, and that file keeps the `server-only` guard.

   Splitting it this way is what stops a "just drop the server-only import so
   the seed runs" change, which is how key material ends up in a client
   bundle.

   ENVELOPE FORMAT:  v1.<iv>.<authTag>.<ciphertext>   (each part base64url)

   The version prefix is not decoration. Rotating the key or moving to KMS
   means writing a `v2` encoder while `decrypt` keeps understanding `v1`, so
   the migration is a background re-encrypt rather than a flag day.

   GCM, not CBC: the auth tag makes the ciphertext tamper-evident. With CBC an
   attacker with write access to the database can flip bits in a DEA number
   and the app will happily decrypt the result into a different valid-looking
   string. Here it throws.
   ========================================================================= */

const VERSION = "v1";
/** 96 bits is the GCM-recommended nonce size — longer ones get re-hashed. */
const IV_BYTES = 12;

/** Decodes and checks a base64 key. Throws loudly rather than half-working. */
export function toKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("Field encryption key must be base64 of exactly 32 bytes.");
  }
  return key;
}

export function encryptField(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptField(envelope: string, key: Buffer): string {
  const [version, iv, tag, ciphertext] = envelope.split(".");

  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Unrecognised ciphertext envelope.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  // Throws if the tag does not verify — i.e. if the row was tampered with.
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * The four characters an admin needs to match a number against a document,
 * without anything having to decrypt.
 *
 * Padded rather than truncated for short inputs: returning the whole value for
 * a 3-character string would defeat the point of storing a hint.
 */
export function last4(value: string): string {
  const digits = value.replace(/\s|-/g, "");
  return digits.length <= 4 ? digits.padStart(4, "•") : digits.slice(-4);
}

/** Encrypt + hint in one call, for the `…Ciphertext` / `…Last4` column pairs. */
export function sealField(plaintext: string, key: Buffer): { ciphertext: string; last4: string } {
  return { ciphertext: encryptField(plaintext, key), last4: last4(plaintext) };
}
