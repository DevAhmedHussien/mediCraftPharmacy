# Medicraft Pharmacy

A high-performance, SEO-optimized marketing site for **Medicraft Pharmacy**, a
specialty compounding pharmacy. Built with Next.js 14 (App Router), TypeScript,
Tailwind CSS, and Framer Motion.

## Stack
- **Next.js 14** — App Router, server components, built-in metadata/SEO
- **TypeScript** — strict mode
- **Tailwind CSS** — custom brand theme
- **Framer Motion** — scroll-reveal + entrance animations
- **lucide-react** — icons

## Getting started
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Structure
```
app/            layout, page, sitemap.ts, robots.ts, global CSS
components/      Navbar, Footer + sections/ (Hero, Products, Quality, ...)
lib/            site.ts (brand config), data.ts (content)
```

## SEO built in
- Per-page metadata + Open Graph / Twitter cards (`app/layout.tsx`)
- JSON-LD `Pharmacy` structured data
- `sitemap.xml` and `robots.txt` generated at build
- Semantic HTML, `prefers-reduced-motion` support, responsive layout

## Replacing placeholder assets
All copy is original to Medicraft. Imagery currently loads royalty-free
Unsplash photos as **placeholders**. Before launch, replace them with
Medicraft's own licensed photography/video:

1. Drop real files into `public/` (e.g. `public/hero.jpg`, `public/lab.mp4`).
2. Swap the `src` values in `components/sections/Hero.tsx`, `Products.tsx`,
   `Quality.tsx`, and the image URLs in `lib/data.ts`.
3. Update brand details (phone, address, hours, social) in `lib/site.ts`.

> Note: This site is an original build. It does not reuse another pharmacy's
> proprietary images, video, or copy — that keeps you clear of copyright issues
> and avoids duplicate-content SEO penalties.
