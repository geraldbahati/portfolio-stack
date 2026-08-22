import type { PostHog } from "posthog-js";
import { getConsent } from "./consent";
import { setAnalyticsCapture, trackAnalyticsConsentUpdated } from "./events";

const SENSITIVE_QUERY_PARAMS = ["token", "secret", "key", "password", "api_key", "email"];

const EXCLUDED_PATH_PREFIXES = ["/admin", "/private", "/login", "/dashboard"];

export type PostHogBrowserConfig = {
  key: string;
  host: string;
  uiHost?: string;
  enabled: boolean;
};

let clientPromise: Promise<PostHog | null> | null = null;
let browserConfig: PostHogBrowserConfig | null = null;

function scrubUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    for (const param of SENSITIVE_QUERY_PARAMS) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function configurePostHogBrowser(config: PostHogBrowserConfig) {
  browserConfig = config;
}

export function isPostHogEnabled() {
  return Boolean(browserConfig?.enabled && browserConfig.key);
}

export function getPostHogClient(options?: { force?: boolean }): Promise<PostHog | null> {
  if (typeof window === "undefined" || !isPostHogEnabled() || !browserConfig) {
    return Promise.resolve(null);
  }

  const consent = getConsent();
  if (!options?.force && consent !== "accepted") {
    return Promise.resolve(null);
  }

  const { key, host, uiHost } = browserConfig;

  if (!clientPromise) {
    clientPromise = import("posthog-js")
      .then(({ default: posthog }) => {
        const hasConsent = getConsent() === "accepted";

        posthog.init(key, {
          api_host: host,
          ui_host: uiHost ?? "https://eu.posthog.com",
          defaults: "2026-05-30",
          autocapture: false,
          capture_pageview: true,
          capture_pageleave: true,
          persistence: hasConsent ? "localStorage+cookie" : "memory",
          opt_out_capturing_by_default: !hasConsent,
          person_profiles: "identified_only",
          capture_exceptions: false,
          disable_session_recording: true,
          capture_performance: true,
          before_send: (event) => {
            if (!event) {
              return null;
            }

            const currentPath = window.location.pathname;
            if (EXCLUDED_PATH_PREFIXES.some((prefix) => currentPath.startsWith(prefix))) {
              return null;
            }

            const properties = { ...event.properties };
            for (const property of ["$current_url", "$referrer"]) {
              const scrubbed = scrubUrl(properties[property]);
              if (scrubbed) {
                properties[property] = scrubbed;
              } else {
                delete properties[property];
              }
            }

            return { ...event, properties };
          },
        });

        setAnalyticsCapture((event, properties) => {
          posthog.capture(event, properties);
        });

        return posthog;
      })
      .catch((error) => {
        clientPromise = null;
        console.warn("[analytics] failed to load PostHog", error);
        return null;
      });
  }

  return clientPromise;
}

export function schedulePostHogInitialization() {
  if (typeof window === "undefined" || !isPostHogEnabled() || getConsent() !== "accepted") {
    return;
  }

  const initialize = () => {
    void getPostHogClient();
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(initialize, { timeout: 2_000 });
  } else {
    globalThis.setTimeout(initialize, 1_000);
  }
}

export async function applyConsent(decision: "accepted" | "rejected") {
  if (typeof window === "undefined" || !isPostHogEnabled()) {
    return;
  }

  // Declining analytics must not download the analytics SDK just to opt out.
  if (decision === "rejected" && !clientPromise) {
    return;
  }

  const posthog = await getPostHogClient({ force: true });
  if (!posthog) return;

  if (decision === "accepted") {
    posthog.set_config({ persistence: "localStorage+cookie" });
    posthog.opt_in_capturing();
    trackAnalyticsConsentUpdated({ decision });
    return;
  }

  posthog.opt_out_capturing();
  posthog.set_config({ persistence: "memory" });
}
