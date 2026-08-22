const STREAM_CUSTOMER = "customer-pdxnd9di8ybc2kur.cloudflarestream.com";
// Cloudflare Web Analytics is injected at the edge, so the script origin and
// the beacon's reporting origin both have to be allowed even though nothing in
// this codebase requests them.
const CF_INSIGHTS_SCRIPT = "https://static.cloudflareinsights.com";
const CF_INSIGHTS_BEACON = "https://cloudflareinsights.com";

export function contentSecurityPolicy(
  isDevelopment: boolean,
  connectOrigins: string[] = [],
): string {
  const extraOrigin = connectOrigins
    .map((origin) => origin.replace(/\/$/, ""))
    .filter((origin) => origin && origin !== "null")
    .join(" ");

  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com ${CF_INSIGHTS_SCRIPT};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:${extraOrigin ? ` ${extraOrigin}` : ""};
    font-src 'self' data:;
    media-src 'self' blob: https://media.geraldbahati.dev https://${STREAM_CUSTOMER};
    connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://media.geraldbahati.dev https://${STREAM_CUSTOMER} https://challenges.cloudflare.com ${CF_INSIGHTS_BEACON}${extraOrigin ? ` ${extraOrigin}` : ""};
    frame-src 'self' https://challenges.cloudflare.com https://${STREAM_CUSTOMER};
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDevelopment ? "" : "upgrade-insecure-requests;"}
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function applySecurityHeaders(
  headers: Headers,
  isDevelopment: boolean,
  connectOrigins: string[] = [],
) {
  headers.set("Content-Security-Policy", contentSecurityPolicy(isDevelopment, connectOrigins));
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  headers.set("X-DNS-Prefetch-Control", "on");
  if (!isDevelopment) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}
