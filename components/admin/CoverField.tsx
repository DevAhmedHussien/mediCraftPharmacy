"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { confirmCoverUpload, requestCoverUpload } from "@/app/admin/blog/actions";
import { IMAGE_ACCEPT, MAX_IMAGE_MB } from "@/lib/uploads";

type Cover = { id: string; key: string; alt: string | null } | null;

/** Natural size of the picked file, read in the browser before upload. */
function readSize(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * The article's cover photograph: preview, replace, remove, and alt text.
 *
 * The chosen cover travels with the form as the hidden `coverMediaId`, so
 * saving an article without touching this panel keeps the cover it had. The
 * form used to have no such field, and every save sent a blank id that the
 * update wrote as "no cover".
 */
export function CoverField({ cover }: { cover: Cover }) {
  const [current, setCurrent] = useState<Cover>(cover);
  const [alt, setAlt] = useState(cover?.alt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Images must be ${MAX_IMAGE_MB} MB or smaller.`);
      return;
    }
    setBusy(true);
    try {
      const grant = await requestCoverUpload({ filename: file.name, mime: file.type, size: file.size });
      if (!grant.ok) return setError(grant.message);

      const put = await fetch(grant.url, { method: "PUT", headers: grant.headers, body: file });
      if (!put.ok) return setError("The upload did not complete. Please try again.");

      const size = await readSize(file);
      const saved = await confirmCoverUpload({
        key: grant.key,
        filename: file.name,
        mime: file.type,
        size: file.size,
        ...size,
      });
      if (!saved.ok) return setError(saved.message);

      setCurrent({ id: saved.id, key: saved.key, alt: null });
      setAlt("");
    } catch {
      setError("We could not reach storage. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="coverMediaId" value={current?.id ?? ""} />

      <div
        className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-dashed bg-[color:var(--admin-bg)]"
        style={{ borderColor: "var(--admin-border-strong)" }}
      >
        {current ? (
          <Image
            src={`/api/uploads/${current.key}`}
            alt=""
            fill
            sizes="22rem"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-[0.8125rem] text-[color:var(--admin-ink-50)]">
            <ImagePlus className="size-6" strokeWidth={1.75} aria-hidden />
            No cover yet
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-6 animate-spin text-[color:var(--admin-accent)]" aria-hidden />
            <span className="sr-only">Uploading</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="btn-outline btn-sm cursor-pointer">
          <ImagePlus className="size-4" aria-hidden />
          {current ? "Replace image" : "Upload image"}
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
        {current && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              setCurrent(null);
              setAlt("");
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </button>
        )}
      </div>

      {current && (
        <div>
          <label htmlFor="coverAlt" className="admin-label">
            Image description <span className="font-normal text-[color:var(--admin-ink-50)]">(alt text)</span>
          </label>
          <input
            id="coverAlt"
            name="coverAlt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={300}
            placeholder="What the photograph shows, for screen readers"
            className="admin-input mt-1.5 w-full"
          />
        </div>
      )}

      <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
        JPG, PNG or WebP, up to {MAX_IMAGE_MB} MB. Landscape works best: the blog shows it at 16:10.
      </p>
      {error && (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--status-danger-fg)]">
          {error}
        </p>
      )}
    </div>
  );
}
