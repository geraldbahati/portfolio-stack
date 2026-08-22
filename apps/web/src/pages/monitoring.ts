import { PUBLIC_SENTRY_DSN } from "astro:env/client";
import type { APIRoute } from "astro";

import { resolveSentryEnvelopeTarget } from "../lib/http/sentry-tunnel";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const envelope = await request.text();
  const target = resolveSentryEnvelopeTarget(envelope, PUBLIC_SENTRY_DSN);
  if (!target) {
    return new Response("{}", {
      status: PUBLIC_SENTRY_DSN ? 400 : 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const upstream = await fetch(target.ingestUrl, {
    method: "POST",
    body: target.envelope,
    headers: {
      "Content-Type": "application/x-sentry-envelope",
    },
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
};
