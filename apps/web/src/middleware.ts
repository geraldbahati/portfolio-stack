import { PUBLIC_SERVER_URL } from "astro:env/client";
import { defineMiddleware } from "astro:middleware";

import { sanitizeUrl } from "@portfolio-stack/analytics/privacy";

import { parseAdminSessionUser } from "./lib/admin/session";
import { cacheControlForPath, isImmutableAsset, isPrivatePath } from "./lib/http/cache";
import { applySecurityHeaders } from "./lib/http/security-headers";
import { canonicalRedirectFor } from "./lib/seo/site";

function serverOrigin() {
  try {
    return [new URL(PUBLIC_SERVER_URL).origin];
  } catch {
    return [];
  }
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

async function guardAdminRoute(context: Parameters<typeof onRequest>[0]) {
  const sessionUrl = new URL("/internal/admin-session", PUBLIC_SERVER_URL);
  const headers = new Headers();
  const cookie = context.request.headers.get("cookie");

  if (cookie) headers.set("cookie", cookie);

  try {
    const authResponse = await fetch(sessionUrl, { headers });

    if (authResponse.status === 401) {
      const returnTo = `${context.url.pathname}${context.url.search}`;
      return context.redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`, 302);
    }

    if (authResponse.status === 403) {
      return new Response("Not found", { status: 404 });
    }

    if (!authResponse.ok) {
      context.locals.telemetry?.captureException(
        new Error(`Admin session check failed with status ${authResponse.status}`),
        { operation: "web.admin_session", fingerprint: "web.admin_session" },
      );
      return new Response("Admin service unavailable", {
        status: 503,
        headers: { "Retry-After": "30" },
      });
    }

    const admin = parseAdminSessionUser(await authResponse.json());
    if (!admin) {
      return new Response("Admin service unavailable", {
        status: 503,
        headers: { "Retry-After": "30" },
      });
    }

    context.locals.admin = admin;
  } catch (error) {
    context.locals.telemetry?.captureException(error, { operation: "web.admin_session" });
    return new Response("Admin service unavailable", {
      status: 503,
      headers: { "Retry-After": "30" },
    });
  }

  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Before any other work, so nothing is rendered, authenticated, or cached
  // under a non-canonical origin.
  const canonical = canonicalRedirectFor(context.url);
  if (canonical) {
    return context.redirect(canonical, 301);
  }

  // Prerendering runs in Node at build time, with no request to correlate and
  // no Workers runtime, so the telemetry module (which needs one) loads lazily.
  if (!context.isPrerendered) {
    const { webTelemetry } = await import("./lib/observability/server-telemetry");
    const requestId = context.request.headers.get("cf-ray") ?? crypto.randomUUID();
    context.locals.requestId = requestId;
    context.locals.telemetry = webTelemetry({
      request_id: requestId,
      $current_url: sanitizeUrl(context.url.href),
    });
  }

  let response: Response;
  try {
    if (isAdminPath(context.url.pathname)) {
      const guardedResponse = await guardAdminRoute(context);
      response = guardedResponse ?? (await next());
    } else {
      response = await next();
    }
  } catch (error) {
    // Astro renders the 500 page after this rethrow; report the cause first.
    context.locals.telemetry?.captureException(error, {
      operation: `web.render ${context.routePattern}`,
      handled: false,
      mechanism: "middleware",
    });
    throw error;
  }
  const headers = new Headers(response.headers);
  const isDevelopment = import.meta.env.DEV;

  applySecurityHeaders(headers, isDevelopment, serverOrigin());

  const { pathname, search } = context.url;
  const cacheControl = cacheControlForPath(pathname, search);

  const immutable = !isPrivatePath(pathname) && isImmutableAsset(pathname, search);

  if (immutable || !headers.has("Cache-Control")) {
    headers.set("Cache-Control", cacheControl);
  }

  if (!isPrivatePath(pathname) && (immutable || !headers.has("CDN-Cache-Control"))) {
    headers.set("CDN-Cache-Control", cacheControl);
  }

  // Never let an outage replace a cached public page, even for asset paths.
  if (response.status >= 500) {
    headers.set("Cache-Control", "no-store");
    headers.set("CDN-Cache-Control", "no-store");
  }

  if (isPrivatePath(pathname)) {
    headers.set("CDN-Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  if (context.locals.requestId) headers.set("X-Request-Id", context.locals.requestId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
