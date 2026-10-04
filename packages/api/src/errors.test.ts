import { ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import { reportProcedureError } from "./errors";

function context() {
  return { telemetry: { captureException: vi.fn() } } as unknown as Parameters<
    typeof reportProcedureError
  >[1]["context"] & { telemetry: { captureException: ReturnType<typeof vi.fn> } };
}

describe("reportProcedureError", () => {
  it.each(["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "TOO_MANY_REQUESTS"] as const)(
    "keeps expected %s errors out of error tracking",
    (code) => {
      const ctx = context();
      reportProcedureError(new ORPCError(code), {
        path: ["admin", "media", "delete"],
        context: ctx,
      });
      expect(ctx.telemetry.captureException).not.toHaveBeenCalled();
    },
  );

  it("reports server faults with the procedure path as the operation", () => {
    const ctx = context();
    const error = new Error("D1_ERROR: database is locked");
    reportProcedureError(error, { path: ["admin", "projects", "update"], context: ctx });
    expect(ctx.telemetry.captureException).toHaveBeenCalledWith(error, {
      operation: "rpc.admin.projects.update",
      handled: false,
      mechanism: "middleware",
    });
  });

  it("reports deliberate internal errors", () => {
    const ctx = context();
    reportProcedureError(new ORPCError("INTERNAL_SERVER_ERROR"), {
      path: ["stream", "deleteVideo"],
      context: ctx,
    });
    expect(ctx.telemetry.captureException).toHaveBeenCalledOnce();
  });
});
