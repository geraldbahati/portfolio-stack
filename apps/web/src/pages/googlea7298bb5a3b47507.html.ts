import type { APIRoute } from "astro";

/**
 * Google Search Console verification. Google fetches this exact filename and
 * treats a redirect as failure, so it cannot be a static file or prerendered —
 * both route through the Cloudflare asset handler, which strips `.html`.
 */
export const prerender = false;

const BODY = "google-site-verification: googlea7298bb5a3b47507.html\n";

export const GET: APIRoute = () =>
  new Response(BODY, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
