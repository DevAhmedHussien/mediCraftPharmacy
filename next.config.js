/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /*
   * Self-contained server build, for the container image.
   *
   * `next build` normally leaves the server depending on the whole of
   * node_modules, which makes a production image roughly a gigabyte of which
   * almost nothing is used at runtime. `standalone` traces the modules the
   * server actually reaches and copies just those into .next/standalone, so
   * the runner stage can start from a clean base with no install step at all.
   *
   * `next dev` ignores this, so local development is unaffected.
   *
   * Two things it does NOT trace, because nothing imports them — they are read
   * from disk by path at runtime — and which the Dockerfile therefore copies
   * by hand: assets/msa (the agreement template) and public/.
   */
  output: "standalone",

  /*
   * Modules the tracer misses.
   *
   * `@aws-sdk/s3-request-presigner` is a declared dependency, imported at the
   * top of lib/services/storage.ts, and the tracer still leaves it out of
   * .next/standalone — `@aws-sdk/client-s3` and fifteen of its siblings come
   * across, that one does not.
   *
   * The failure is worth recording, because nothing about it points at a
   * missing module. Document upload is a presigned PUT: the browser asks the
   * server for a signed URL, and the server action that mints it throws
   * ERR_MODULE_NOT_FOUND. The client catches that as a failed request and
   * reports "We could not reach storage. Check your connection and try
   * again." So the symptom is a network message, on a page that is plainly
   * loading fine, with nothing in the S3 logs because no request was ever
   * made — and it only appears in a container, because `next dev` resolves
   * from the full node_modules and works perfectly.
   */
  // Under `experimental` because this is Next 14; the option moved to the
  // top level in 15, and set there it is silently ignored.
  experimental: {
    outputFileTracingIncludes: {
      "/**": ["./node_modules/@aws-sdk/s3-request-presigner/**"],
    },
  },

  /*
   * Build output directory, overridable per-invocation.
   *
   * `next dev` and `next build` both write to `.next` by default, so running a
   * build while the dev server is up overwrites the chunks the dev server is
   * actively serving. The dev server then 500s with
   * `Cannot find module './8948.js'` — a real failure with a completely
   * misleading message, since nothing is wrong with the code.
   *
   * `npm run build:check` sets NEXT_DIST_DIR=.next-build so a verification
   * build can run alongside a live dev server without touching it.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    /*
     * No image optimiser. Every image is a finished file in public/, already
     * WebP and already at its display size, and the browser downloads exactly
     * that file. `next/image` only writes the <img> tag (lazy loading,
     * width/height to reserve space) and does nothing to the bytes.
     *
     * The optimiser re-encoded each photo on request on a 2-vCPU t4g.small:
     * measured on production, 16 October 2026, one 1080px image took 6-13 s
     * and came out softer than the file it was made from. Its cache lived in
     * the container, so every deploy started the wait over.
     */
    unoptimized: true,
  },

  /*
   * Long-lived caching for the static image tree.
   *
   * Next serves /public with `public, max-age=0`, which makes a browser
   * revalidate every logo and photograph on every navigation. Those are
   * conditional requests, so they come back 304 with no body — but each one
   * still costs a full round trip, and there are a dozen on the home page.
   *
   * A day of freshness plus a week of stale-while-revalidate: a repeat
   * visitor paints instantly from cache, and a replaced file is picked up in
   * the background within a day rather than needing a hard refresh. Hashed
   * assets under /_next/static already get a year from Next itself.
   */
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
