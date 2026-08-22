const DEFAULT_HOST = "https://eu.i.posthog.com";

export type ServerCaptureInput = {
  apiKey: string;
  host?: string;
  event: string;
  distinctId: string;
  properties?: Record<string, string | number | boolean | null>;
};

/**
 * Server-side PostHog capture. No person profiles, no PII.
 * A missing key is a no-op — analytics must never fail the caller.
 */
export async function captureServerEvent(input: ServerCaptureInput) {
  if (!input.apiKey) {
    return;
  }

  const host = (input.host ?? DEFAULT_HOST).replace(/\/$/, "");

  try {
    const response = await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      signal: AbortSignal.timeout(5_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: input.apiKey,
        event: input.event,
        distinct_id: input.distinctId,
        timestamp: new Date().toISOString(),
        properties: {
          ...input.properties,
          $process_person_profile: false,
        },
      }),
    });

    if (!response.ok) {
      console.error(
        `[analytics] PostHog capture failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error("[analytics] PostHog capture threw", error);
  }
}
