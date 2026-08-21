import { PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_KEY, PUBLIC_SENTRY_DSN } from "astro:env/client";
import {
  applyConsent,
  configurePostHogBrowser,
  schedulePostHogInitialization,
} from "@portfolio-stack/analytics/posthog-client";
import { sentryOptions } from "@portfolio-stack/analytics/sentry";

const environment =
  (import.meta.env.PUBLIC_ENVIRONMENT as string | undefined) ??
  (import.meta.env.PROD ? "production" : "development");

if (PUBLIC_SENTRY_DSN) {
  void import("@sentry/astro").then((Sentry) => {
    Sentry.init({
      ...sentryOptions(PUBLIC_SENTRY_DSN, environment),
      tunnel: "/monitoring",
    });
  });
}

configurePostHogBrowser({
  key: PUBLIC_POSTHOG_KEY ?? "",
  host: PUBLIC_POSTHOG_HOST,
  uiHost: "https://eu.posthog.com",
  enabled: Boolean(PUBLIC_POSTHOG_KEY) && import.meta.env.PROD,
});

schedulePostHogInitialization();

window.addEventListener("analytics-consent-change", (event) => {
  const decision = (event as CustomEvent<"accepted" | "rejected">).detail;
  void applyConsent(decision);
});
