import { describe, expect, it } from "vitest";

import { validateProductionEnvironment } from "./production-readiness";

const validEnvironment = {
  ENVIRONMENT: "production",
  WEB_DOMAIN: "geraldbahati.dev",
  SERVER_DOMAIN: "portfolio-api.geraldbahati.dev",
  WEB_REDIRECT_DOMAINS: "www.geraldbahati.dev",
  CORS_ORIGIN: "https://geraldbahati.dev",
  BETTER_AUTH_SECRET: "2xmF7vRpQ9wKs4Yt8Nc6Hd3Jb5Lg1ZaE",
  AUTH_COOKIE_DOMAIN: "geraldbahati.dev",
  ENABLE_ADMIN: "true",
  ENABLE_ADMIN_SEED: "false",
  PUBLIC_MEDIA_ORIGIN: "https://media.geraldbahati.dev",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
  RESEND_API_KEY: "resend-key",
  RESEND_WEBHOOK_SECRET: "whsec_M2RyOWpzS1JvR1JKWk9PSmIyREtoUlc1eTA1",
  SENDER_EMAIL: "Gerald Bahati <contact@geraldbahati.dev>",
  RECIPIENT_EMAIL: "contact@geraldbahati.dev",
  CLOUDFLARE_ACCOUNT_ID: "cloudflare-account-id",
  CLOUDFLARE_STREAM_API_TOKEN: "cloudflare-stream-token",
  R2_BUCKET_NAME: "portfolio-media",
  SENTRY_DSN: "https://public@o4500000000000000.ingest.de.sentry.io/4500000000000001",
  PUBLIC_SENTRY_DSN: "https://public@o4500000000000000.ingest.de.sentry.io/4500000000000001",
  SENTRY_AUTH_TOKEN: "sntrys_source_map_upload_token",
  SENTRY_ORG: "artlife-5r",
  SENTRY_PROJECT: "portfolio",
  POSTHOG_PROJECT_KEY: "phc_production_project_token",
  PUBLIC_POSTHOG_KEY: "phc_production_project_token",
  POSTHOG_HOST: "https://eu.i.posthog.com",
  PUBLIC_POSTHOG_HOST: "/gbx",
};

describe("production readiness", () => {
  it("accepts a hardened production configuration", () => {
    expect(validateProductionEnvironment(validEnvironment)).toEqual([]);
  });

  it("rejects local, wildcard, and path-based CORS entries", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      CORS_ORIGIN: "http://localhost:4321,https://*.example.com,https://geraldbahati.dev/contact",
    });

    expect(
      issues.filter((issue) => issue.key === "CORS_ORIGIN" && issue.severity === "error"),
    ).toHaveLength(4);
  });

  it("does not include secret values in validation output", () => {
    const weakSecret = "not-safe";
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      BETTER_AUTH_SECRET: weakSecret,
    });

    expect(issues.some((issue) => issue.key === "BETTER_AUTH_SECRET")).toBe(true);
    expect(JSON.stringify(issues)).not.toContain(weakSecret);
  });

  it("requires the cookie domain to contain both application hosts", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      AUTH_COOKIE_DOMAIN: "other.example.com",
    });

    expect(issues.filter((issue) => issue.key === "AUTH_COOKIE_DOMAIN")).toHaveLength(2);
  });

  it("rejects redirect hostnames that serve another production surface", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      WEB_REDIRECT_DOMAINS: "portfolio-api.geraldbahati.dev",
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ key: "WEB_REDIRECT_DOMAINS", severity: "error" }),
    );
  });

  it("requires a strong secret and credentials for temporary bootstrap access", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      ENABLE_ADMIN_SEED: "true",
      SEED_ADMIN_SECRET: "weak",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "SEED_ADMIN_SECRET", severity: "error" }),
        expect.objectContaining({ key: "ENABLE_ADMIN_SEED", severity: "error" }),
        expect.objectContaining({ key: "ENABLE_ADMIN_SEED", severity: "warning" }),
      ]),
    );
  });

  it("fails when production delivery or admin media configuration is incomplete", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      RESEND_API_KEY: "",
      RESEND_WEBHOOK_SECRET: "",
      SENDER_EMAIL: "",
      RECIPIENT_EMAIL: "",
      CLOUDFLARE_ACCOUNT_ID: "",
      CLOUDFLARE_STREAM_API_TOKEN: "",
      R2_BUCKET_NAME: "",
    });

    for (const key of [
      "RESEND_API_KEY",
      "RESEND_WEBHOOK_SECRET",
      "SENDER_EMAIL",
      "RECIPIENT_EMAIL",
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_STREAM_API_TOKEN",
      "R2_BUCKET_NAME",
    ]) {
      expect(issues).toContainEqual(expect.objectContaining({ key, severity: "error" }));
    }
  });

  it("requires matching Sentry and PostHog browser/server projects", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      PUBLIC_SENTRY_DSN: "https://other@o4500000000000000.ingest.de.sentry.io/4500000000000002",
      PUBLIC_POSTHOG_KEY: "phc_another_project_token",
      PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "PUBLIC_SENTRY_DSN", severity: "error" }),
        expect.objectContaining({ key: "PUBLIC_POSTHOG_KEY", severity: "error" }),
        expect.objectContaining({ key: "PUBLIC_POSTHOG_HOST", severity: "error" }),
      ]),
    );
  });

  it("fails when production monitoring configuration is incomplete", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      SENTRY_DSN: "",
      PUBLIC_SENTRY_DSN: "",
      SENTRY_AUTH_TOKEN: "",
      SENTRY_ORG: "",
      SENTRY_PROJECT: "",
      POSTHOG_PROJECT_KEY: "",
      PUBLIC_POSTHOG_KEY: "",
      POSTHOG_HOST: "",
      PUBLIC_POSTHOG_HOST: "",
    });

    for (const key of [
      "SENTRY_DSN",
      "PUBLIC_SENTRY_DSN",
      "SENTRY_AUTH_TOKEN",
      "SENTRY_ORG",
      "SENTRY_PROJECT",
      "POSTHOG_PROJECT_KEY",
      "PUBLIC_POSTHOG_KEY",
      "POSTHOG_HOST",
      "PUBLIC_POSTHOG_HOST",
    ]) {
      expect(issues).toContainEqual(expect.objectContaining({ key, severity: "error" }));
    }
  });

  it("rejects invalid delivery addresses", () => {
    const issues = validateProductionEnvironment({
      ...validEnvironment,
      SENDER_EMAIL: "Portfolio <not-an-email>",
      RECIPIENT_EMAIL: "also-invalid",
    });

    expect(issues.filter((issue) => issue.key === "SENDER_EMAIL")).toHaveLength(1);
    expect(issues.filter((issue) => issue.key === "RECIPIENT_EMAIL")).toHaveLength(1);
  });
});
