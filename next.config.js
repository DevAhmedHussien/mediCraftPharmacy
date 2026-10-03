/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
