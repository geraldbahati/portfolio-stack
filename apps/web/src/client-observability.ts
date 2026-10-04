import { PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_KEY } from "astro:env/client";
import { installBrowserErrorReporter } from "@portfolio-stack/analytics/error-tracking/browser";
import {
  applyConsent,
  configurePostHogBrowser,
  getAnalyticsIdentity,
  schedulePostHogInitialization,
} from "@portfolio-stack/analytics/posthog-client";

const enabled = Boolean(PUBLIC_POSTHOG_KEY) && import.meta.env.PROD;

// Essential error reporting: two listeners now, the stack parser only on the
// first error, and delivery through the same-origin relay. It links to the
// analytics session only when the visitor has accepted analytics.
if (enabled) {
  installBrowserErrorReporter({ endpoint: "/monitoring", getIdentity: getAnalyticsIdentity });
}

configurePostHogBrowser({
  key: PUBLIC_POSTHOG_KEY ?? "",
  host: PUBLIC_POSTHOG_HOST,
  uiHost: "https://eu.posthog.com",
  enabled,
});

schedulePostHogInitialization();

window.addEventListener("analytics-consent-change", (event) => {
  const decision = (event as CustomEvent<"accepted" | "rejected">).detail;
  void applyConsent(decision);
});
