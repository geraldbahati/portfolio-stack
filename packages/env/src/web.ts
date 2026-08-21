import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_SERVER_URL: z.url(),
    PUBLIC_POSTHOG_KEY: z.string().optional(),
    PUBLIC_POSTHOG_HOST: z.string().default("/gbx"),
    PUBLIC_SENTRY_DSN: z.string().optional(),
    PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    PUBLIC_STREAM_CUSTOMER: z.string().default("customer-pdxnd9di8ybc2kur.cloudflarestream.com"),
    PUBLIC_MEDIA_ORIGIN: z.url().default("https://media.geraldbahati.dev"),
    PUBLIC_IMAGE_TRANSFORM_ZONE: z.string().default("media.geraldbahati.dev"),
    PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),
  },
  runtimeEnv: (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env,
  emptyStringAsUndefined: true,
});
