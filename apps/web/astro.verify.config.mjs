import { distilledCloudflare } from "@alchemy.run/cloudflare-frameworks/astro/cloudflare";

import { createAstroConfig } from "./astro.config.mjs";

// Verification must stay local even when the developer has deployment credentials.
const config = createAstroConfig({ uploadSourceMaps: false });

/**
 * A deployment-free production build used by CI and local verification.
 * Alchemy injects the same adapter in real deployments; this file lets
 * `bun run build` exercise the Worker bundle without changing cloud state.
 */
export default {
  ...config,
  integrations: [
    ...(config.integrations ?? []),
    distilledCloudflare({
      prerenderEnvironment: "node",
      vite: {
        compatibilityDate: "2026-07-11",
        compatibilityFlags: ["nodejs_compat"],
      },
    }),
  ],
};
