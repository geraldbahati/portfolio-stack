import { PUBLIC_SERVER_URL } from "astro:env/client";
import { defineMiddleware } from "astro:middleware";

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
  } catch {
    return new Response("Admin service unavailable", {
      status: 503,
      headers: { "Retry-After": "30" },
    });
  }

  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Alias hosts (the bare apex) are attached to this Worker so they resolve,
  // but only the canonical host serves content. Redirect before any other work
  // so no request is rendered, authenticated, or cached under a non-canonical
  // origin.
  const canonical = canonicalRedirectFor(context.url);
  if (canonical) {
    return context.redirect(canonical, 301);
  }

  let response: Response;

  if (isAdminPath(context.url.pathname)) {
    const guardedResponse = await guardAdminRoute(context);
    response = guardedResponse ?? (await next());
  } else {
    response = await next();
  }
  const headers = new Headers(response.headers);
  const isDevelopment = import.meta.env.DEV;

  applySecurityHeaders(headers, isDevelopment, serverOrigin());

  const { pathname, search } = context.url;
  const cacheControl = cacheControlForPath(pathname, search);
  // Content-addressed responses get the immutable policy even when the route
  // already set one. `/_image` in particular used to fall through to
  // `s-maxage=60`, so the Worker re-encoded the LCP image roughly every minute.
  const immutable = !isPrivatePath(pathname) && isImmutableAsset(pathname, search);

  if (immutable || !headers.has("Cache-Control")) {
    headers.set("Cache-Control", cacheControl);
  }

  if (!isPrivatePath(pathname) && (immutable || !headers.has("CDN-Cache-Control"))) {
    headers.set("CDN-Cache-Control", cacheControl);
  }

  if (isPrivatePath(pathname)) {
    headers.set("CDN-Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
