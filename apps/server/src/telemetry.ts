import {
  createServerTelemetry,
  type ServerTelemetry,
  type TelemetryContext,
} from "@portfolio-stack/analytics/server";
import { env } from "@portfolio-stack/env/server";

type Deferrer = { waitUntil(promise: Promise<unknown>): void };

/**
 * Telemetry for one request or scheduled run. Delivery is handed to the
 * runtime, so responses never wait on PostHog.
 */
export function workerTelemetry(execution: Deferrer, context: TelemetryContext): ServerTelemetry {
  return createServerTelemetry(
    {
      apiKey: env.POSTHOG_PROJECT_KEY,
      host: env.POSTHOG_HOST,
      service: "api",
      environment: env.ENVIRONMENT,
      release: env.CF_VERSION_METADATA?.id,
      defer: (task) => execution.waitUntil(task),
    },
    context,
  );
}

/** Cloudflare's ray ID already correlates with Workers Logs; generate one only when absent. */
export function requestIdFor(request: Request) {
  return request.headers.get("cf-ray") ?? crypto.randomUUID();
}
