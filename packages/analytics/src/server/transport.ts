export const POSTHOG_EU_INGEST_HOST = "https://eu.i.posthog.com";
export const POSTHOG_EU_ASSET_HOST = "https://eu-assets.i.posthog.com";

const DEFAULT_TIMEOUT_MS = 3_000;

export type PostHogProperties = Record<string, unknown>;

export type PostHogEvent = {
  event: string;
  distinct_id: string;
  timestamp?: string;
  properties: PostHogProperties;
};

export type PostHogTransportConfig = {
  apiKey: string;
  host?: string;
  timeoutMs?: number;
};

/**
 * Deliver events in a single bounded request. Never throws: analytics and
 * error reporting must not change the outcome of the work being observed.
 */
export async function sendPostHogEvents(
  config: PostHogTransportConfig,
  events: PostHogEvent[],
): Promise<boolean> {
  if (!config.apiKey || events.length === 0) return false;

  const host = (config.host || POSTHOG_EU_INGEST_HOST).replace(/\/$/, "");
  try {
    const response = await fetch(`${host}/batch/`, {
      method: "POST",
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: config.apiKey, batch: events }),
    });
    if (!response.ok) {
      console.error({
        event: "posthog_delivery_failed",
        status: response.status,
        events: events.length,
      });
    }
    return response.ok;
  } catch (error) {
    console.error({
      event: "posthog_delivery_failed",
      reason: error instanceof Error ? error.name : "unknown",
      events: events.length,
    });
    return false;
  }
}
