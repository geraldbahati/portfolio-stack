export type ReadinessSeverity = "error" | "warning";

export interface ReadinessIssue {
  key: string;
  message: string;
  severity: ReadinessSeverity;
}

type Environment = Record<string, string | undefined>;

const PLACEHOLDER_VALUES = new Set([
  "changeme",
  "change-me",
  "placeholder",
  "secret",
  "your-secret-here",
]);

function value(env: Environment, key: string): string {
  return env[key]?.trim() ?? "";
}

function enabled(env: Environment, key: string): boolean {
  return value(env, key).toLowerCase() === "true";
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^\./, "").replace(/\.$/, "");
}

function validHostname(hostname: string): boolean {
  return (
    hostname.includes(".") &&
    !hostname.includes("/") &&
    !hostname.includes(":") &&
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(hostname)
  );
}

function hostnameWithinDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function parseHttpsOrigin(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.origin !== raw ||
      !validHostname(url.hostname)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function parseSentryDsn(raw: string): URL | null {
  try {
    const url = new URL(raw);
    const projectId = url.pathname.split("/").filter(Boolean).at(-1);
    if (
      url.protocol !== "https:" ||
      !url.username ||
      url.password ||
      !/^(?:[^.]+\.)?ingest(?:\.(?:us|de))?\.sentry\.io$/i.test(url.hostname) ||
      !projectId ||
      !/^\d+$/.test(projectId)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function secretIsStrong(secret: string): boolean {
  const normalized = secret.toLowerCase();
  return (
    secret.length >= 32 &&
    !PLACEHOLDER_VALUES.has(normalized) &&
    !/^(.)\1+$/.test(secret) &&
    new Set(secret).size >= 12
  );
}

function validEmailAddress(raw: string): boolean {
  const bracketedAddress = raw.match(/<([^<>]+)>/)?.[1];
  const email = (bracketedAddress ?? raw).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function add(issues: ReadinessIssue[], severity: ReadinessSeverity, key: string, message: string) {
  issues.push({ key, message, severity });
}

/**
 * Validate only deployment configuration. Secret values are never returned,
 * so callers can safely print every issue in CI logs.
 */
export function validateProductionEnvironment(env: Environment): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  if (value(env, "ENVIRONMENT") !== "production") {
    add(issues, "error", "ENVIRONMENT", 'must be exactly "production"');
  }

  const webDomain = normalizeDomain(value(env, "WEB_DOMAIN"));
  const serverDomain = normalizeDomain(value(env, "SERVER_DOMAIN"));

  if (!validHostname(webDomain)) {
    add(issues, "error", "WEB_DOMAIN", "must be a valid production hostname");
  }
  if (!validHostname(serverDomain)) {
    add(issues, "error", "SERVER_DOMAIN", "must be a valid production hostname");
  }
  if (webDomain && serverDomain && webDomain === serverDomain) {
    add(issues, "error", "SERVER_DOMAIN", "must be different from WEB_DOMAIN");
  }

  const redirectDomains = value(env, "WEB_REDIRECT_DOMAINS")
    .split(",")
    .map(normalizeDomain)
    .filter(Boolean);
  for (const domain of redirectDomains) {
    if (!validHostname(domain) || domain === webDomain || domain === serverDomain) {
      add(
        issues,
        "error",
        "WEB_REDIRECT_DOMAINS",
        `contains an invalid or conflicting redirect hostname (${domain})`,
      );
    }
  }

  const corsOrigins = value(env, "CORS_ORIGIN")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    add(issues, "error", "CORS_ORIGIN", "must contain at least one exact HTTPS web origin");
  }

  for (const origin of corsOrigins) {
    if (!parseHttpsOrigin(origin)) {
      add(
        issues,
        "error",
        "CORS_ORIGIN",
        `contains an invalid production origin (${origin}); paths, wildcards, and HTTP are not allowed`,
      );
    }
  }

  if (webDomain && !corsOrigins.includes(`https://${webDomain}`)) {
    add(issues, "error", "CORS_ORIGIN", "must include the canonical WEB_DOMAIN origin");
  }

  if (!secretIsStrong(value(env, "BETTER_AUTH_SECRET"))) {
    add(
      issues,
      "error",
      "BETTER_AUTH_SECRET",
      "must be a high-entropy secret of at least 32 characters",
    );
  }

  if (!enabled(env, "ENABLE_ADMIN")) {
    add(issues, "error", "ENABLE_ADMIN", 'must be "true" for the admin deployment');
  }

  const cookieDomain = normalizeDomain(value(env, "AUTH_COOKIE_DOMAIN"));
  if (!validHostname(cookieDomain)) {
    add(
      issues,
      "error",
      "AUTH_COOKIE_DOMAIN",
      "must be the shared parent domain for the web and API hosts",
    );
  } else {
    if (webDomain && !hostnameWithinDomain(webDomain, cookieDomain)) {
      add(issues, "error", "AUTH_COOKIE_DOMAIN", "does not contain WEB_DOMAIN");
    }
    if (serverDomain && !hostnameWithinDomain(serverDomain, cookieDomain)) {
      add(issues, "error", "AUTH_COOKIE_DOMAIN", "does not contain SERVER_DOMAIN");
    }
  }

  const mediaOrigin = value(env, "PUBLIC_MEDIA_ORIGIN");
  if (!parseHttpsOrigin(mediaOrigin)) {
    add(issues, "error", "PUBLIC_MEDIA_ORIGIN", "must be an exact HTTPS origin");
  }

  const turnstileSecret = value(env, "TURNSTILE_SECRET_KEY");
  const turnstileSiteKey = value(env, "PUBLIC_TURNSTILE_SITE_KEY");
  if (!turnstileSecret || !turnstileSiteKey) {
    add(
      issues,
      "error",
      "TURNSTILE_SECRET_KEY",
      "and PUBLIC_TURNSTILE_SITE_KEY are required together for the production contact form",
    );
  }

  if (enabled(env, "ENABLE_ADMIN_SEED")) {
    if (!secretIsStrong(value(env, "SEED_ADMIN_SECRET"))) {
      add(
        issues,
        "error",
        "SEED_ADMIN_SECRET",
        "must be a high-entropy secret of at least 32 characters while bootstrap access is enabled",
      );
    }
    if (!value(env, "ADMIN_EMAIL") || !value(env, "ADMIN_PASSWORD")) {
      add(
        issues,
        "error",
        "ENABLE_ADMIN_SEED",
        "requires ADMIN_EMAIL and ADMIN_PASSWORD for the one-time bootstrap command",
      );
    }
    add(
      issues,
      "warning",
      "ENABLE_ADMIN_SEED",
      "is temporary; disable it and redeploy immediately after bootstrap",
    );
  } else if (value(env, "SEED_ADMIN_SECRET")) {
    add(
      issues,
      "warning",
      "SEED_ADMIN_SECRET",
      "is configured while bootstrap access is disabled; remove it after bootstrap",
    );
  }

  if (!value(env, "RESEND_API_KEY")) {
    add(
      issues,
      "error",
      "RESEND_API_KEY",
      "is required because the production contact form fails closed when email delivery is unavailable",
    );
  }
  if (!secretIsStrong(value(env, "RESEND_WEBHOOK_SECRET"))) {
    add(
      issues,
      "error",
      "RESEND_WEBHOOK_SECRET",
      "must be the high-entropy signing secret for the production Resend webhook",
    );
  }
  if (!validEmailAddress(value(env, "SENDER_EMAIL"))) {
    add(issues, "error", "SENDER_EMAIL", "must contain a valid address on a verified domain");
  }
  if (!validEmailAddress(value(env, "RECIPIENT_EMAIL"))) {
    add(issues, "error", "RECIPIENT_EMAIL", "must be a valid notification address");
  }

  if (!value(env, "CLOUDFLARE_ACCOUNT_ID")) {
    add(
      issues,
      "error",
      "CLOUDFLARE_ACCOUNT_ID",
      "is required by production Stream administration",
    );
  }
  if (!value(env, "CLOUDFLARE_STREAM_API_TOKEN")) {
    add(
      issues,
      "error",
      "CLOUDFLARE_STREAM_API_TOKEN",
      "is required for production video administration",
    );
  }
  if (!value(env, "R2_BUCKET_NAME")) {
    add(
      issues,
      "error",
      "R2_BUCKET_NAME",
      "must explicitly name the production media bucket to prevent accidental adoption of a default",
    );
  }

  const sentryDsn = value(env, "SENTRY_DSN");
  const publicSentryDsn = value(env, "PUBLIC_SENTRY_DSN");
  if (!parseSentryDsn(sentryDsn)) {
    add(issues, "error", "SENTRY_DSN", "must be a valid Sentry Cloud project DSN");
  }
  if (!parseSentryDsn(publicSentryDsn)) {
    add(issues, "error", "PUBLIC_SENTRY_DSN", "must be a valid browser Sentry Cloud project DSN");
  } else if (sentryDsn && sentryDsn !== publicSentryDsn) {
    add(
      issues,
      "error",
      "PUBLIC_SENTRY_DSN",
      "must match SENTRY_DSN so the browser tunnel cannot relay to another project",
    );
  }
  for (const key of ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"]) {
    if (!value(env, key)) {
      add(issues, "error", key, "is required for production source-map uploads");
    }
  }

  const posthogServerKey = value(env, "POSTHOG_PROJECT_KEY");
  const posthogBrowserKey = value(env, "PUBLIC_POSTHOG_KEY");
  if (!posthogServerKey.startsWith("phc_") || posthogServerKey.length < 20) {
    add(issues, "error", "POSTHOG_PROJECT_KEY", "must be the PostHog project token");
  }
  if (!posthogBrowserKey.startsWith("phc_") || posthogBrowserKey.length < 20) {
    add(issues, "error", "PUBLIC_POSTHOG_KEY", "must be the browser PostHog project token");
  } else if (posthogServerKey && posthogServerKey !== posthogBrowserKey) {
    add(
      issues,
      "error",
      "PUBLIC_POSTHOG_KEY",
      "must match POSTHOG_PROJECT_KEY so browser and server events share one project",
    );
  }
  if (value(env, "POSTHOG_HOST") !== "https://eu.i.posthog.com") {
    add(issues, "error", "POSTHOG_HOST", "must target the PostHog EU ingestion host");
  }
  if (value(env, "PUBLIC_POSTHOG_HOST") !== "/gbx") {
    add(issues, "error", "PUBLIC_POSTHOG_HOST", 'must use the first-party "/gbx" proxy');
  }

  return issues;
}
