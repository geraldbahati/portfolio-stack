import { beforeEach, describe, expect, it, vi } from "vitest";

const writeAuditLog = vi.hoisted(() => vi.fn());
vi.mock("@portfolio-stack/db/audit", () => ({ writeAuditLog }));

import { isDefinitiveStreamRejection, StreamApiError } from "../stream/cloudflare";
import { type AuditedOperation, runAuditedOperation } from "./run";

vi.mock("@portfolio-stack/env/server", () => ({ env: {} }));

const captureException = vi.fn();
const telemetry = {
  captureException,
  withContext: () => telemetry,
} as unknown as AuditedOperation["telemetry"];

const operation: AuditedOperation = {
  actor: { id: "user-1", email: "admin@example.com", requestId: "req-1" },
  telemetry,
  action: "stream.delete",
  entityType: "stream_video",
  entityId: "abc123",
  isDefinitiveFailure: isDefinitiveStreamRejection,
};

function outcomes() {
  return writeAuditLog.mock.calls.map(([, entry]) => entry.outcome);
}

beforeEach(() => {
  writeAuditLog.mockReset();
  writeAuditLog.mockResolvedValue(undefined);
  captureException.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("runAuditedOperation", () => {
  it("records intent then success under one operation ID", async () => {
    await expect(runAuditedOperation(operation, async () => "done")).resolves.toBe("done");
    expect(outcomes()).toEqual(["pending", "succeeded"]);
    const [first, second] = writeAuditLog.mock.calls.map(([, entry]) => entry.operationId);
    expect(first).toBe(second);
  });

  it("records a definitive provider rejection as failed", async () => {
    const rejection = new StreamApiError("delete", 403);
    await expect(runAuditedOperation(operation, () => Promise.reject(rejection))).rejects.toBe(
      rejection,
    );
    expect(outcomes()).toEqual(["pending", "failed"]);
  });

  it.each([
    ["a timeout", new DOMException("The operation timed out.", "TimeoutError")],
    ["a network failure", new TypeError("fetch failed")],
    ["a provider 5xx", new StreamApiError("delete", 502)],
    ["a 408", new StreamApiError("delete", 408)],
  ])("leaves the intent pending for reconciliation after %s", async (_name, error) => {
    await expect(runAuditedOperation(operation, () => Promise.reject(error))).rejects.toBe(error);
    expect(outcomes()).toEqual(["pending"]);
  });

  it("treats every error as ambiguous when no classifier is given", async () => {
    const { isDefinitiveFailure: _, ...unclassified } = operation;
    await expect(
      runAuditedOperation(unclassified, () => Promise.reject(new Error("R2 put failed"))),
    ).rejects.toThrow();
    expect(outcomes()).toEqual(["pending"]);
  });

  it("does not attempt the operation when the intent cannot be recorded", async () => {
    writeAuditLog.mockRejectedValueOnce(new Error("D1 unavailable"));
    const execute = vi.fn();
    await expect(runAuditedOperation(operation, execute)).rejects.toThrow("D1 unavailable");
    expect(execute).not.toHaveBeenCalled();
  });

  it("succeeds and reports when only the completion write fails", async () => {
    writeAuditLog.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("D1 busy"));
    await expect(runAuditedOperation(operation, async () => "done")).resolves.toBe("done");
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: "audit.record_success" }),
    );
  });
});
