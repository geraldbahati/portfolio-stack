// @ts-check
import sentry from "@sentry/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

import { siteImages } from "./vite-plugin-site-images";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const isE2e = process.env.E2E_MODE === "true";

// https://astro.build/config
export default defineConfig({
  output: "server",
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  build: {
    inlineStylesheets: "always",
  },
  integrations: [
    sentry({
      telemetry: false,
      enabled: { client: false, server: true },
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayIframe: true,
        excludeReplayShadowDom: true,
        excludeReplayWorker: true,
      },
      org: process.env.SENTRY_ORG || "artlife-5r",
      project: process.env.SENTRY_PROJECT || "portfolio",
      authToken: sentryAuthToken,
      sourcemaps: { disable: !sentryAuthToken },
    }),
    {
      name: "portfolio:keep-page-script",
      hooks: {
        "astro:config:setup"({ injectScript }) {
          injectScript("page", "void 0;");
        },
      },
    },
  ],
  env: {
    schema: {
      PUBLIC_SERVER_URL: envField.string({
        access: "public",
        context: "client",
        default: "http://localhost:3000",
      }),
      PUBLIC_POSTHOG_KEY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_POSTHOG_HOST: envField.string({
        access: "public",
        context: "client",
        default: "/gbx",
      }),
      PUBLIC_SENTRY_DSN: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_STREAM_CUSTOMER: envField.string({
        access: "public",
        context: "client",
        default: "customer-pdxnd9di8ybc2kur.cloudflarestream.com",
      }),
      PUBLIC_MEDIA_ORIGIN: envField.string({
        access: "public",
        context: "client",
        default: "https://media.geraldbahati.dev",
      }),
      PUBLIC_IMAGE_TRANSFORM_ZONE: envField.string({
        access: "public",
        context: "client",
        default: "media.geraldbahati.dev",
      }),
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  image: {
    domains: ["media.geraldbahati.dev"],
    remotePatterns: [{ protocol: "https", hostname: "media.geraldbahati.dev" }],
  },
  vite: {
    cacheDir: isE2e ? "node_modules/.vite-e2e" : "node_modules/.vite",
    build: {
      chunkSizeWarningLimit: 600,
    },
    plugins: [siteImages(), tailwindcss()],
  },
});
