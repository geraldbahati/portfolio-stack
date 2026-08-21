import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const optionalString = (name: string, fallback = "") =>
  Config.string(name).pipe(Config.withDefault(fallback));

const r2BucketName = process.env.R2_BUCKET_NAME ?? "portfolio-media";
// Latest date supported by the pinned workerd build. Advance this together
// with Alchemy/workerd so local and deployed runtimes stay reproducible.
const WORKERS_COMPATIBILITY_DATE = "2026-07-11";

export const db = Cloudflare.D1.Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

export const media = Cloudflare.R2.Bucket("media", {
  name: r2BucketName,
});

export const server = Cloudflare.Worker("server", {
  main: "../../apps/server/src/index.ts",
  compatibility: {
    date: WORKERS_COMPATIBILITY_DATE,
    flags: ["nodejs_compat"],
  },
  env: {
    DB: db,
    MEDIA: media,
    CONTACT_RATE_LIMIT: Cloudflare.RateLimit("CONTACT_RATE_LIMIT", {
      namespaceId: 1001,
      simple: { limit: 10, period: 60 },
    }),
    CORS_ORIGIN: Config.string("CORS_ORIGIN"),
    BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Cloudflare.Worker.URL,
    AUTH_COOKIE_DOMAIN: optionalString("AUTH_COOKIE_DOMAIN"),
    ENABLE_ADMIN: optionalString("ENABLE_ADMIN", "false"),
    SEED_ADMIN_SECRET: optionalString("SEED_ADMIN_SECRET"),
    ENVIRONMENT: optionalString("ENVIRONMENT", "development"),
    SENTRY_DSN: optionalString("SENTRY_DSN"),
    POSTHOG_PROJECT_KEY: optionalString("POSTHOG_PROJECT_KEY"),
    POSTHOG_HOST: optionalString("POSTHOG_HOST", "https://eu.i.posthog.com"),
    RESEND_API_KEY: optionalString("RESEND_API_KEY"),
    RESEND_WEBHOOK_SECRET: optionalString("RESEND_WEBHOOK_SECRET"),
    SENDER_EMAIL: optionalString("SENDER_EMAIL", "Gerald Bahati <contact@geraldbahati.dev>"),
    RECIPIENT_EMAIL: optionalString("RECIPIENT_EMAIL", "contact@geraldbahati.dev"),
    TURNSTILE_SECRET_KEY: optionalString("TURNSTILE_SECRET_KEY"),
    CLOUDFLARE_ACCOUNT_ID: optionalString("CLOUDFLARE_ACCOUNT_ID"),
    CLOUDFLARE_API_TOKEN: optionalString("CLOUDFLARE_API_TOKEN"),
  },
  dev: {
    port: 3000,
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
        ENVIRONMENT: optionalString("ENVIRONMENT", "development"),
      },
      dev: {
        port: 4321,
      },
    });

    return {
      web: webWorker.url,
      server: serverWorker.url,
    };
  }),
);
