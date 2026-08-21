import { PUBLIC_SERVER_URL } from "astro:env/client";
import { defineMiddleware } from "astro:middleware";

import { cacheControlForPath, isPrivatePath } from "./lib/cache";
import { applySecurityHeaders } from "./lib/security-headers";

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
  } catch {
    return new Response("Admin service unavailable", {
      status: 503,
      headers: { "Retry-After": "30" },
    });
  }

  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
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

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", cacheControlForPath(context.url.pathname));
  }

  if (!isPrivatePath(context.url.pathname) && !headers.has("CDN-Cache-Control")) {
    headers.set("CDN-Cache-Control", cacheControlForPath(context.url.pathname));
  }

  if (isPrivatePath(context.url.pathname)) {
    headers.set("CDN-Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
