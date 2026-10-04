// @ts-check

import { readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import posthogRollupPlugin from "@posthog/rollup-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

import { siteImages } from "./vite-plugin-site-images";

const isE2e = process.env.E2E_MODE === "true";

/** @typedef {import("@posthog/rollup-plugin").PostHogRollupPluginOptions} SourceMapUpload */

/**
 * Upload credentials for PostHog symbolication. These use posthog-cli's own
 * variable names, so the same values work for the CLI. The personal API key is
 * a build-time secret and must never be prefixed with PUBLIC_.
 * @returns {SourceMapUpload | null}
 */
function sourceMapUploadFromEnv() {
  const personalApiKey = process.env.POSTHOG_CLI_API_KEY;
  const projectId = process.env.POSTHOG_CLI_PROJECT_ID;
  if (!personalApiKey || !projectId) return null;
  return {
    personalApiKey,
    projectId,
    host: process.env.POSTHOG_CLI_HOST || "https://eu.posthog.com",
  };
}

/**
 * Generate hidden source maps for the browser bundle, inject PostHog chunk
 * IDs, upload the maps, and delete them before the assets are deployed. Only
 * the client environment is processed: the Worker bundle is not minified and
 * its maps would never be served. The plugin's global `config` hook is
 * dropped for the same reason; the client environment enables maps below.
 * @param {SourceMapUpload} upload
 * @returns {import("vite").Plugin}
 */
function posthogSourceMaps(upload) {
  const { config: _globalConfig, ...plugin } = /** @type {import("vite").Plugin} */ (
    posthogRollupPlugin({
      ...upload,
      sourcemaps: { releaseName: "portfolio-web", deleteAfterUpload: true, ...upload.sourcemaps },
    })
  );
  return { ...plugin, applyToEnvironment: (environment) => environment.name === "client" };
}

/**
 * Maps are uploaded, never served. The plugin deletes the maps it uploads, but
 * Astro inlines some small scripts into HTML after bundling and leaves their
 * maps behind, so sweep whatever remains in the client output.
 * @returns {import("astro").AstroIntegration}
 */
function stripPublishedSourceMaps() {
  return {
    name: "portfolio:strip-published-source-maps",
    hooks: {
      async "astro:build:done"({ dir, logger }) {
        const root = fileURLToPath(dir);
        const maps = (await readdir(root, { recursive: true })).filter((file) =>
          file.endsWith(".map"),
        );
        await Promise.all(maps.map((file) => rm(`${root}/${file}`, { force: true })));
        if (maps.length > 0) logger.info(`removed ${maps.length} unpublished source maps`);
      },
    },
  };
}

/** @param {{ sourceMapUpload?: SourceMapUpload | null }} [options] */
export function createAstroConfig({ sourceMapUpload = sourceMapUploadFromEnv() } = {}) {
  return defineConfig({
    output: "server",
    // Browser checks exercise the portfolio, without the development audit overlay.
    devToolbar: { enabled: !isE2e },
    prefetch: {
      prefetchAll: false,
      defaultStrategy: "hover",
    },
    build: {
      inlineStylesheets: "always",
    },
    integrations: [
      {
        name: "portfolio:keep-page-script",
        hooks: {
          "astro:config:setup"({ injectScript }) {
            injectScript("page", "void 0;");
          },
        },
      },
      ...(sourceMapUpload ? [stripPublishedSourceMaps()] : []),
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
        // Labels server-side error reports; read at runtime from the Worker.
        ENVIRONMENT: envField.string({
          access: "public",
          context: "server",
          default: "development",
        }),
      },
    },
    image: {
      domains: ["media.geraldbahati.dev"],
      remotePatterns: [{ protocol: "https", hostname: "media.geraldbahati.dev" }],
    },
    vite: {
      cacheDir: isE2e ? "node_modules/.vite-e2e" : "node_modules/.vite",
      // Vite's startup scan misses these: each is reached either through a
      // dynamic import or through a workspace package it treats as source, so
      // they are only discovered once a browser actually requests the module.
      // Discovering a dependency mid-session triggers a re-optimize and a
      // program reload, which aborts every request already in flight — the
      // 502s and "failed to fetch dynamically imported module" errors that made
      // the end-to-end suite flaky. Naming them here pre-bundles them at
      // startup, so no reload happens after the server reports ready.
      optimizeDeps: {
        include: [
          "@orpc/client",
          "@orpc/client/fetch",
          "better-auth/client",
          "hls.js",
          "@portfolio-stack/analytics > posthog-js",
          "@portfolio-stack/analytics > @posthog/core/error-tracking",
          "zod",
        ],
      },
      build: {
        chunkSizeWarningLimit: 600,
      },
      ...(sourceMapUpload ? { environments: { client: { build: { sourcemap: "hidden" } } } } : {}),
      plugins: [
        siteImages(),
        tailwindcss(),
        ...(sourceMapUpload ? [posthogSourceMaps(sourceMapUpload)] : []),
      ],
    },
  });
}

export default createAstroConfig();
