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
    // Two render-blocking stylesheets cost ~450 ms on a throttled mobile
    // connection. The HTML is served from a Worker and already compressed, so
    // carrying the CSS inline is cheaper than the extra round trips.
    inlineStylesheets: "always",
  },
  integrations: [
    sentry({
      telemetry: false,
      // The integration otherwise injects its own `Sentry.init` (with Session
      // Replay and browser tracing) into every page as an eager module script.
      // `src/client-observability.ts` already owns the browser init, so this
      // would be a second, unconfigured SDK on the critical path.
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
    // Astro appends its prefetch bootstrap to the injected "page" script
    // bundle, and only emits that bundle when at least one integration
    // contributes to it. Disabling the Sentry client integration above left no
    // contributors, which silently switched off hover prefetching site-wide.
    // This no-op keeps the bundle alive so Astro's own bootstrap still ships;
    // injecting the bootstrap directly would declare `init` twice and break
    // the whole script.
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
    // Keep Playwright's optimizer artifacts separate from the regular dev server.
    // Both servers may run concurrently, and sharing Vite's mutable cache can
    // briefly restart the E2E worker while a browser test is loading a page.
    cacheDir: isE2e ? "node_modules/.vite-e2e" : "node_modules/.vite",
    build: {
      // hls.js is a deliberate 574 kB lazy chunk (177 kB gzip) and is
      // requested only when a visible project video needs MSE playback.
      chunkSizeWarningLimit: 600,
    },
    plugins: [siteImages(), tailwindcss()],
  },
});
