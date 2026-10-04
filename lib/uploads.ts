/* ===========================================================================
   What may be uploaded.

   Deliberately NOT in lib/services/storage.ts. That module is `server-only`,
   so the browser could not read these limits and the uploader had no way to
   check a file before sending it — a partner picked a 40 MB scan, waited, and
   only then learned the cap. The rule has to be stated in one place and
   enforced in two: here, so the form can say it up front and refuse early, and
   again on the server, which is the actual gate.
   ========================================================================= */

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB

/** What the file picker filters on. */
export const DOCUMENT_ACCEPT = DOCUMENT_MIME_TYPES.join(",");

/** Said out loud in the UI, so nobody discovers the rule by breaking it. */
export const DOCUMENT_RULE = "PDF, JPG, PNG or WebP · up to 25 MB";

export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The client-side check, returning a message rather than throwing.
 *
 * Names what is wrong AND what would be right: "That file is 41.3 MB. The
 * limit is 25 MB" tells someone what to do next; "Invalid file" does not.
 *
 * `accept` on the input is a filter, not a guarantee — most desktop pickers
 * let you switch to "All files", and a drop target bypasses it entirely.
 */
export function checkDocument(file: { name: string; type: string; size: number }): string | null {
  if (!(DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    const kind = file.type || file.name.split(".").pop()?.toUpperCase() || "That file type";
    return `${kind} cannot be accepted. Upload a ${DOCUMENT_RULE.split(" · ")[0]}.`;
  }
  if (file.size === 0) {
    return "That file is empty. Check it opens on your machine and try again.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `That file is ${readableSize(file.size)}. The limit is ${readableSize(
      MAX_DOCUMENT_BYTES
    )} — try exporting it at a lower quality.`;
  }
  return null;
}
