import type { APIRoute } from "astro";

/**
 * Google Search Console site verification.
 *
 * Served from a route rather than `public/` on purpose: the Cloudflare asset
 * handler strips `.html` from static files, so `public/` would answer this
 * exact path with a 307 to the extensionless URL. Google fetches the literal
 * filename it issued and treats a redirect as a failed check, so the route
 * has to own the path and return 200 directly.
 *
 * The body is the single line Google generated; it must match byte for byte.
 *
 * Not prerendered either: prerendering emits a static `.html` file, which
 * lands back under the same asset handler and redirects again. Rendering on
 * request keeps the path with the Worker.
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
