import { PUBLIC_POSTHOG_KEY } from "astro:env/client";
import { ENVIRONMENT } from "astro:env/server";
import { env, waitUntil } from "cloudflare:workers";
import {
  type CaptureExceptionInput,
  createServerTelemetry,
  POSTHOG_EU_INGEST_HOST,
  type ServerTelemetry,
  type TelemetryContext,
} from "@portfolio-stack/analytics/server";

type WebBindings = { CF_VERSION_METADATA?: { id: string } };

/**
 * Error tracking for the web Worker, configured exactly like the API Worker:
 * same project, explicit environment and release, the same redaction, and
 * delivery after the response via `waitUntil`.
 */
export function webTelemetry(context: TelemetryContext = {}): ServerTelemetry {
  return createServerTelemetry(
    {
      apiKey: PUBLIC_POSTHOG_KEY,
      host: POSTHOG_EU_INGEST_HOST,
      service: "web",
      environment: ENVIRONMENT,
      release: (env as WebBindings).CF_VERSION_METADATA?.id,
      defer: waitUntil,
    },
    context,
  );
}

/** For shared code with no request of its own, such as the coalesced public-data cache. */
export function captureWebException(error: unknown, input: CaptureExceptionInput) {
  webTelemetry().captureException(error, input);
}
