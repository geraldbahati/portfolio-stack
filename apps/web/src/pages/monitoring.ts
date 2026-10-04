import { PUBLIC_POSTHOG_KEY } from "astro:env/client";
import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { handleMonitoringRequest } from "../lib/observability/monitoring-relay";
import { webTelemetry } from "../lib/observability/server-telemetry";

export const prerender = false;

type MonitoringBindings = {
  MONITORING_RATE_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
};

export const POST: APIRoute = ({ request }) =>
  handleMonitoringRequest(request, {
    enabled: Boolean(PUBLIC_POSTHOG_KEY),
    telemetry: webTelemetry(),
    limiter: (env as MonitoringBindings).MONITORING_RATE_LIMIT,
  });
