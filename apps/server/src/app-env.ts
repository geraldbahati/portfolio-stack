import type { ServerTelemetry } from "@portfolio-stack/analytics/server";

/** Per-request values set by the first middleware and read by every route. */
export type AppEnv = {
  Variables: {
    requestId: string;
    telemetry: ServerTelemetry;
  };
};
