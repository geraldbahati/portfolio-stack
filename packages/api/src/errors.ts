import { ORPCError } from "@orpc/server";

import type { Context } from "./context";

/**
 * Client errors (validation, authentication, authorization, missing records,
 * rate limits) are the caller's to fix and stay out of error tracking. Only
 * server faults, including unexpected throws, are reported.
 */
export function isExpectedProcedureError(error: unknown) {
  return error instanceof ORPCError && error.status < 500;
}

/** Report an unexpected procedure failure once, named by its RPC path. */
export function reportProcedureError(
  error: unknown,
  options: { path: readonly string[]; context: Pick<Context, "telemetry"> },
) {
  if (isExpectedProcedureError(error)) return;

  options.context.telemetry.captureException(error, {
    operation: `rpc.${options.path.join(".")}`,
    handled: false,
    mechanism: "middleware",
  });
}
