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
     * Every image is local now, so no remote hosts need allowing — the Unsplash
     * and Pexels patterns that used to live here are gone along with the remote
     * fetches they permitted.
     *
     * AVIF first, WebP second: the optimizer serves the smallest format the
     * requesting browser accepts, so modern browsers get AVIF (typically
     * 20-30% under WebP) and anything older falls back to WebP.
     */
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = nextConfig;
