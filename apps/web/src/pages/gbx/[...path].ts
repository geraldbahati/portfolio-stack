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

/**
 * Resolve a `/gbx/*` path to its upstream PostHog URL.
 *
 * Asset requests go to the CDN host and ingest requests to the API host, but
 * the `static/` segment is part of the upstream path on both — PostHog serves
 * its lazily loaded chunks (web vitals, surveys, dead-click autocapture) at
 * `/static/<version>/<chunk>.js`. Stripping the segment made every one of
 * those chunks 404, which the browser then refused to execute for having no
 * MIME type.
 */
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
