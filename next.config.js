/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
