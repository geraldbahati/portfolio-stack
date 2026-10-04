/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    admin?: import("./lib/admin/session").AdminSessionUser;
    /** Correlates this render with Workers Logs and error tracking. */
    requestId?: string;
    /** Request-scoped error tracking, set by the middleware. */
    telemetry?: import("@portfolio-stack/analytics/server").ServerTelemetry;
  }
}
