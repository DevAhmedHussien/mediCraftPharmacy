import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

/**
 * robots.txt.
 *
 * AI crawlers are allowed ON PURPOSE, and named individually rather than left
 * to the wildcard. A compounding pharmacy's buyers increasingly ask an
 * assistant "which pharmacy compounds tirzepatide in flex-dose vials" before
 * they ask a search engine, and a model that has never been allowed to read
 * this site cannot answer with it. Naming each agent also means the policy is
 * explicit and reviewable — if the owner later wants to exclude one, it is a
 * one-line change rather than a wildcard nobody can reason about.
 *
 * The admin, the API and the auth routes are disallowed for everyone. They
 * are behind auth anyway, but a crawler hammering /api/auth wastes budget
 * that should be spent on the formulary.
 */
const AI_AGENTS = [
  "GPTBot",            // OpenAI, training
  "OAI-SearchBot",     // OpenAI, search index
  "ChatGPT-User",      // OpenAI, live user fetch
  "ClaudeBot",         // Anthropic, training
  "Claude-User",       // Anthropic, live user fetch
  "Claude-SearchBot",  // Anthropic, search index
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",   // Gemini / Vertex grounding
  "Applebot-Extended",
  "CCBot",             // Common Crawl
  "meta-externalagent",
  "Bytespider",
];

/**
 * `/portal` is in here, and it was not.
 *
 * The ten partner-portal routes redirect anyone unauthenticated to /login, so
 * nothing private was ever exposed — but a crawler does not know that until
 * it has fetched each one and followed the redirect. Left out, Googlebot
 * walks ten redirect chains on a site whose crawl budget should go to the
 * formulary, and Search Console fills with "Page with redirect" for URLs that
 * are not meant to be indexed in the first place.
 */
const DISALLOW = ["/admin", "/api/", "/login", "/portal"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
