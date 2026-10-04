import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/uploads";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

/* ===========================================================================
   File storage, behind one interface with two drivers.

   S3 is the real implementation and is complete — presigned PUT for uploads,
   presigned GET for downloads, private bucket, no public ACL anywhere. The
   local driver exists so the whole feature (admin uploads a blog cover, the
   post renders it) runs end to end today without AWS credentials, and so the
   test suite never touches the network.

   WHY UPLOADS ARE PRESIGNED RATHER THAN PROXIED
   ---------------------------------------------
   A 12 MB image posted to a Next.js route handler is 12 MB through the
   serverless function: it counts against the body-size limit, the execution
   timeout, and the bill. Presigning hands the browser a short-lived URL and
   the bytes go straight to S3. The server's job shrinks to deciding whether
   this user may upload this kind of file, which is the part that actually
   needs a server.

   WHY THE LOCAL DRIVER DOES NOT WRITE INTO public/
   ------------------------------------------------
   Anything under `public/` is served by Next with no auth check and no
   content-type control, so an uploaded `.html` becomes a stored-XSS page on
   our own origin. Local uploads go to `.uploads/` outside the served tree and
   come back through a route handler that sets the headers, exactly mirroring
   how the S3 driver behaves in production. Dev and prod differ in where the
   bytes live, never in who is allowed to read them.
   ========================================================================= */

/** Images only, and only formats a browser will render as an image. */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/* Document rules come from lib/uploads, which the browser can import too. They
   must be one set of numbers: a form that allows what the server refuses is a
   round trip spent to display an error. Re-exported so existing importers of
   this module keep working. */
export { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/uploads";

/** Presigned URLs expire in five minutes, per the security requirements. */
const SIGNED_URL_TTL_SECONDS = 300;

export type StorageDriverName = "LOCAL" | "S3";

export type PresignedUpload = {
  /** Where the browser PUTs the bytes. */
  url: string;
  /** Headers the browser must echo, or the signature will not match. */
  headers: Record<string, string>;
  key: string;
  driver: StorageDriverName;
  expiresAt: Date;
};

type StorageDriver = {
  name: StorageDriverName;
  presignUpload(key: string, mime: string, size: number): Promise<PresignedUpload>;
  presignDownload(key: string, filename?: string): Promise<string>;
  put(key: string, body: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
};

/* --- Key construction ---------------------------------------------------- */

/**
 * Build an object key that is safe, unguessable and roughly browsable.
 *
 * `prefix/YYYY/MM/<slug>-<uuid>.<ext>`
 *
 * The UUID is the security-relevant part: without it, keys are guessable and
 * a private bucket's only protection is the presign, so a predictable key
 * plus any future misconfiguration becomes an enumeration. The date segments
 * keep an S3 console navigable and make lifecycle rules by age trivial.
 */
export function buildKey(prefix: string, filename: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 10);
  const stem = path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "file";

  return `${prefix}/${year}/${month}/${stem}-${randomUUID()}${ext}`;
}

/**
 * Reject anything that is not what it claims to be, before a URL is signed.
 *
 * The mime allow-list is the important half. Size is checked here as well as
 * in the presign conditions because a client that lies about its size still
 * fails at S3, but failing here gives the user a readable error instead of an
 * opaque 403 from AWS.
 */
export function assertUploadAllowed(
  mime: string,
  size: number,
  kind: "image" | "document"
): void {
  const allowed: readonly string[] = kind === "image" ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;

  if (!allowed.includes(mime)) {
    throw new StorageError(`${mime} is not an accepted ${kind} type.`, "UNSUPPORTED_MEDIA_TYPE", 415);
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new StorageError("A file size is required.", "INVALID_SIZE", 400);
  }
  if (size > max) {
    throw new StorageError(
      `Files must be ${Math.floor(max / 1024 / 1024)} MB or smaller.`,
      "PAYLOAD_TOO_LARGE",
      413
    );
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export function checksum(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

/* --- S3 ------------------------------------------------------------------ */

let s3Client: S3Client | null = null;

function getS3(): S3Client {
  if (!s3Client) {
    /* Credentials are supplied ONLY when they were configured.
     *
     * Omitting the key entirely is what lets the SDK fall back to its
     * default provider chain, which on App Runner resolves the instance role
     * — so production needs no stored key at all. Passing
     * `credentials: { accessKeyId: undefined }` is NOT the same thing: the
     * SDK takes that as an explicit empty credential and signs requests with
     * it, which fails as a 403 that looks like a permissions problem rather
     * than a configuration one.
     *
     * MinIO and LocalStack have no role to find, so local development sets
     * the pair and takes this branch. */
    const explicit =
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            },
          }
        : {};

    s3Client = new S3Client({
      region: env.S3_REGION!,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      ...explicit,
    });
  }
  return s3Client;
}

const s3Driver: StorageDriver = {
  name: "S3",

  async presignUpload(key, mime, size) {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      ContentType: mime,
      ContentLength: size,
      // Encrypted server-side. No ACL is set anywhere in this file: the bucket
      // stays private and every read goes through a presigned GET.
      ServerSideEncryption: "AES256",
    });

    const url = await getSignedUrl(getS3(), command, { expiresIn: SIGNED_URL_TTL_SECONDS });

    return {
      url,
      // Signed into the URL, so the browser must send them back byte for byte.
      headers: { "Content-Type": mime, "x-amz-server-side-encryption": "AES256" },
      key,
      driver: "S3",
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000),
    };
  },

  async presignDownload(key, filename) {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      // Forces a download with the original name rather than the opaque key,
      // and `attachment` stops the browser rendering an uploaded SVG or HTML
      // inline on our own domain.
      ...(filename
        ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"` }
        : {}),
    });

    return getSignedUrl(getS3(), command, { expiresIn: SIGNED_URL_TTL_SECONDS });
  },

  async put(key, body, mime) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: mime,
        ServerSideEncryption: "AES256",
      })
    );
  },

  async get(key) {
    const res = await getS3().send(new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  },

  async remove(key) {
    await getS3().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
  },
};

/* --- Local --------------------------------------------------------------- */

const uploadRoot = () => path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);

/**
 * Resolve a key to a path, refusing anything that escapes the upload root.
 *
 * A key of `../../.env` would otherwise read the environment file. The check
 * is on the *resolved* path rather than on the key string because `..` can be
 * URL-encoded, doubled, or hidden behind a symlink, and only resolution
 * settles where the path actually lands.
 */
function resolveLocal(key: string): string {
  const root = uploadRoot();
  const full = path.resolve(root, key);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new StorageError("Invalid object key.", "INVALID_KEY", 400);
  }
  return full;
}

const localDriver: StorageDriver = {
  name: "LOCAL",

  async presignUpload(key, mime, size) {
    // No signature to compute: the browser PUTs to our own route handler,
    // which re-runs the same auth and mime checks. Deliberately the same
    // shape as the S3 response so the client code is identical either way.
    return {
      url: `/api/uploads/${encodeURI(key)}`,
      headers: { "Content-Type": mime, "x-upload-size": String(size) },
      key,
      driver: "LOCAL",
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000),
    };
  },

  async presignDownload(key) {
    return `/api/uploads/${encodeURI(key)}`;
  },

  async put(key, body) {
    const full = resolveLocal(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  },

  async get(key) {
    return readFile(resolveLocal(key));
  },

  async remove(key) {
    await unlink(resolveLocal(key)).catch(() => undefined);
  },
};

/* --- Selection ----------------------------------------------------------- */

export const storage: StorageDriver = env.STORAGE_DRIVER === "s3" ? s3Driver : localDriver;

/**
 * Read a stored object regardless of which driver wrote it.
 *
 * Media rows carry their own driver, so a database seeded locally and later
 * pointed at S3 still resolves its old files instead of 404ing — see the note
 * on `Media.driver` in the schema.
 */
export function driverFor(name: StorageDriverName): StorageDriver {
  return name === "S3" ? s3Driver : localDriver;
}
