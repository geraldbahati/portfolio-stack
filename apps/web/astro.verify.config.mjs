import { distilledCloudflare } from "@alchemy.run/cloudflare-frameworks/astro/cloudflare";

import config from "./astro.config.mjs";

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
