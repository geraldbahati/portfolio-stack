import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

const operatorEnvPath =
  process.env.PORTFOLIO_ENV === "production" ? "../../.env.production.local" : "./.env";

config({ path: operatorEnvPath });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const optionalString = (name: string, fallback = "") =>
  Config.string(name).pipe(Config.withDefault(fallback));
const optionalRedacted = (name: string) =>
  Config.redacted(name).pipe(Config.withDefault(Redacted.make("")));

const isE2e = process.env.E2E_MODE === "true";
const serverDevPort = isE2e ? 3100 : 3000;
const webDevPort = isE2e ? 4421 : 4321;
const r2BucketName = process.env.R2_BUCKET_NAME ?? "portfolio-media";
const serverDomain = process.env.SERVER_DOMAIN?.trim();
const webDomain = process.env.WEB_DOMAIN?.trim();
const webRedirectDomains = (process.env.WEB_REDIRECT_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim())
  .filter(Boolean);
// Latest date supported by the pinned workerd build. Advance this together
// with Alchemy/workerd so local and deployed runtimes stay reproducible.
const WORKERS_COMPATIBILITY_DATE = "2026-07-11";

export const db = Cloudflare.D1.Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

// The media bucket predates this stack and is shared with the site currently
// served from the apex. Alchemy reconciles CORS and lifecycle rules to exactly
// what is declared here, so both must mirror the live bucket: omitting them
// deletes the browser read/upload policy and the multipart abort rule that
// bucket already relies on.
export const media = Cloudflare.R2.Bucket("media", {
  name: r2BucketName,
  cors: [
    {
      allowedOrigins: [
        "https://geraldbahati.dev",
        "https://www.geraldbahati.dev",
        "http://localhost:3000",
      ],
      allowedMethods: ["GET", "HEAD", "PUT"],
      allowedHeaders: ["*"],
      exposeHeaders: ["ETag"],
      maxAgeSeconds: 3600,
    },
  ],
  lifecycleRules: [
    {
      id: "Default Multipart Abort Rule",
      enabled: true,
      abortMultipartUploadsTransition: {
        condition: { type: "Age", maxAge: 604_800 },
      },
    },
  ],
});

export const server = Cloudflare.Worker("server", {
  main: "../../apps/server/src/index.ts",
  compatibility: {
    date: WORKERS_COMPATIBILITY_DATE,
    flags: ["nodejs_compat"],
  },
  domain: serverDomain || undefined,
  // Keep local workers.dev URLs for development, but expose production only
  // through the canonical custom hostname.
  workersDev: !serverDomain,
  observability: {
    enabled: true,
    logs: { enabled: true, invocationLogs: true, headSamplingRate: 1, persist: true },
    traces: { enabled: true, headSamplingRate: 0.1, persist: true },
  },
  env: {
    DB: db,
    MEDIA: media,
    MEDIA_PUBLIC_ORIGIN: optionalString("PUBLIC_MEDIA_ORIGIN", "https://media.geraldbahati.dev"),
    CONTACT_RATE_LIMIT: Cloudflare.RateLimit("CONTACT_RATE_LIMIT", {
      namespaceId: 1001,
      simple: { limit: 10, period: 60 },
    }),
    CORS_ORIGIN: Config.string("CORS_ORIGIN"),
    BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Cloudflare.Worker.URL,
    AUTH_COOKIE_DOMAIN: optionalString("AUTH_COOKIE_DOMAIN"),
    ENABLE_ADMIN: isE2e ? "true" : optionalString("ENABLE_ADMIN", "false"),
    ENABLE_ADMIN_SEED: isE2e ? "true" : optionalString("ENABLE_ADMIN_SEED", "false"),
    SEED_ADMIN_SECRET: optionalRedacted("SEED_ADMIN_SECRET"),
    ENVIRONMENT: isE2e ? "test" : optionalString("ENVIRONMENT", "development"),
    SENTRY_DSN: optionalRedacted("SENTRY_DSN"),
    POSTHOG_PROJECT_KEY: optionalString("POSTHOG_PROJECT_KEY"),
    POSTHOG_HOST: optionalString("POSTHOG_HOST", "https://eu.i.posthog.com"),
    RESEND_API_KEY: optionalRedacted("RESEND_API_KEY"),
    RESEND_WEBHOOK_SECRET: optionalRedacted("RESEND_WEBHOOK_SECRET"),
    SENDER_EMAIL: optionalString("SENDER_EMAIL", "Gerald Bahati <contact@geraldbahati.dev>"),
    RECIPIENT_EMAIL: optionalString("RECIPIENT_EMAIL", "contact@geraldbahati.dev"),
    TURNSTILE_SECRET_KEY: optionalRedacted("TURNSTILE_SECRET_KEY"),
    CLOUDFLARE_ACCOUNT_ID: optionalString("CLOUDFLARE_ACCOUNT_ID"),
    CLOUDFLARE_STREAM_API_TOKEN: optionalRedacted("CLOUDFLARE_STREAM_API_TOKEN"),
  },
  dev: {
    host: "localhost",
    port: serverDevPort,
    strictPort: true,
  },
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
  "portfolio-stack",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const serverWorker = yield* server;
    const webWorker = yield* Cloudflare.Website.Astro("web", {
      rootDir: "../../apps/web",
      compatibility: {
        date: WORKERS_COMPATIBILITY_DATE,
      },
      // Non-canonical hostnames are attached as aliases rather than Alchemy
      // `redirects`. A `redirects` entry writes a rule into the zone's
      // dynamic-redirect phase, which needs zone ruleset credentials that
      // Cloudflare's OAuth scopes do not cover. The web middleware issues the
      // 301 instead, so the redirect stays in code and under test.
      domain: webDomain
        ? {
            name: webDomain,
            ...(webRedirectDomains.length > 0 ? { aliases: webRedirectDomains } : {}),
          }
        : undefined,
      workersDev: !webDomain,
      observability: {
        enabled: true,
        logs: { enabled: true, invocationLogs: true, headSamplingRate: 1, persist: true },
        traces: { enabled: true, headSamplingRate: 0.1, persist: true },
      },
      env: {
        SESSION: Cloudflare.KV.Namespace("session"),
        IMAGES: Cloudflare.Images.Images(),
        PUBLIC_SERVER_URL: serverWorker.url.as<string>(),
        PUBLIC_POSTHOG_KEY: optionalString("PUBLIC_POSTHOG_KEY"),
        PUBLIC_POSTHOG_HOST: optionalString("PUBLIC_POSTHOG_HOST", "/gbx"),
        PUBLIC_SENTRY_DSN: optionalString("PUBLIC_SENTRY_DSN"),
        PUBLIC_TURNSTILE_SITE_KEY: optionalString("PUBLIC_TURNSTILE_SITE_KEY"),
        PUBLIC_STREAM_CUSTOMER: optionalString(
          "PUBLIC_STREAM_CUSTOMER",
          "customer-pdxnd9di8ybc2kur.cloudflarestream.com",
        ),
        PUBLIC_MEDIA_ORIGIN: optionalString(
          "PUBLIC_MEDIA_ORIGIN",
          "https://media.geraldbahati.dev",
        ),
        PUBLIC_IMAGE_TRANSFORM_ZONE: optionalString(
          "PUBLIC_IMAGE_TRANSFORM_ZONE",
          "media.geraldbahati.dev",
        ),
        PUBLIC_GOOGLE_SITE_VERIFICATION: optionalString("PUBLIC_GOOGLE_SITE_VERIFICATION"),
        SENTRY_DSN: optionalString("SENTRY_DSN"),
        ENVIRONMENT: isE2e ? "test" : optionalString("ENVIRONMENT", "development"),
      },
      dev: {
        port: webDevPort,
        strictPort: true,
      },
    });

    return {
      web: webWorker.url,
      server: serverWorker.url,
    };
  }),
);
