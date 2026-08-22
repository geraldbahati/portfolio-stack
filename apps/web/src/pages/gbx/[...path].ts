import type { APIRoute } from "astro";

export const prerender = false;

const INGEST_HOST = "https://eu.i.posthog.com";
const ASSET_HOST = "https://eu-assets.i.posthog.com";

const hopByHop = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "cookie",
]);

/** Assets go to the CDN host, ingest to the API host. `static/` belongs to the
 * upstream path on both, so it is routed on, not stripped. */
export function posthogTarget(path: string, search: string): string {
  const isStatic = path === "static" || path.startsWith("static/");
  const base = isStatic ? ASSET_HOST : INGEST_HOST;
  return `${base}/${path}${search}`;
}

async function proxyPostHog({ params, request }: Parameters<APIRoute>[0]) {
  const rawPath = params.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : (rawPath ?? "");
  const incoming = new URL(request.url);
  const target = posthogTarget(path, incoming.search);

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!hopByHop.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-expect-error duplex is required for streaming bodies in fetch
    init.duplex = "half";
  }

  const response = await fetch(target, init);
  const outbound = new Headers(response.headers);
  outbound.delete("set-cookie");

  // Upstream sends `max-age=14400` on 404s; passing that through would pin a
  // transient failure into every visitor's cache for four hours.
  if (!response.ok) {
    outbound.set("Cache-Control", "no-store");
    outbound.delete("Expires");
    outbound.delete("ETag");
    outbound.delete("Last-Modified");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outbound,
  });
}

export const ALL: APIRoute = proxyPostHog;
export const GET: APIRoute = proxyPostHog;
export const POST: APIRoute = proxyPostHog;
export const OPTIONS: APIRoute = proxyPostHog;
