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

const SENTRY_IDLE_TIMEOUT_MS = 3_000;

/**
 * The browser SDK is ~50 kB gzipped and used to load while the page was still
 * painting. It now waits for idle time, with early errors held in a buffer and
 * replayed once the SDK is up so nothing is lost during the delay.
 */
function scheduleSentryInitialization(dsn: string) {
  const pending: Array<ErrorEvent | PromiseRejectionEvent> = [];
  let started = false;

  const captureEarly = (event: ErrorEvent | PromiseRejectionEvent) => {
    if (pending.length < 10) pending.push(event);
    start();
  };

  const stopBuffering = () => {
    window.removeEventListener("error", captureEarly);
    window.removeEventListener("unhandledrejection", captureEarly);
  };

  const start = () => {
    if (started) return;
    started = true;

    void import("@sentry/astro")
      .then((Sentry) => {
        Sentry.init({ ...sentryOptions(dsn, environment), tunnel: "/monitoring" });
        stopBuffering();
        for (const event of pending) {
          Sentry.captureException(
            "reason" in event ? event.reason : (event.error ?? event.message),
          );
        }
        pending.length = 0;
      })
      .catch(() => {
        stopBuffering();
      });
  };

  window.addEventListener("error", captureEarly);
  window.addEventListener("unhandledrejection", captureEarly);

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: SENTRY_IDLE_TIMEOUT_MS });
  } else {
    globalThis.setTimeout(start, 2_000);
  }
}

if (PUBLIC_SENTRY_DSN) {
  scheduleSentryInitialization(PUBLIC_SENTRY_DSN);
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
