import type { ServerTelemetry } from "@portfolio-stack/analytics/server";
import { type AuditActor, type AuditEntry, writeAuditLog } from "@portfolio-stack/db/audit";

export type AuditedOperation = {
  actor: AuditActor;
  telemetry: ServerTelemetry;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  /**
   * Whether an error proves the operation did not happen, e.g. the provider
   * answered with a 4xx. Anything else (timeouts, network failures, 5xx) is
   * ambiguous: the provider may have completed the work before the response
   * was lost. Defaults to treating every error as ambiguous.
   */
  isDefinitiveFailure?: (error: unknown) => boolean;
};

/**
 * Run an operation on an external system (Stream, R2) that cannot share a
 * transaction with the audit log:
 *
 * 1. Record the intent. If that fails, nothing has happened yet, so fail.
 * 2. Run the operation. If the provider definitively rejected it, record the
 *    failure. If the outcome is ambiguous, leave the intent pending: the
 *    reconciler checks the external system and records what actually happened.
 *    Either way the error is rethrown.
 * 3. Record success. If only this write fails, the operation did happen, so
 *    report the write failure and succeed; the reconciler resolves the intent.
 */
export async function runAuditedOperation<T>(
  operation: AuditedOperation,
  execute: () => Promise<T>,
): Promise<T> {
  const operationId = crypto.randomUUID();
  const telemetry = operation.telemetry.withContext({ operation_id: operationId });
  const entry = (outcome: AuditEntry["outcome"]): AuditEntry => ({
    action: operation.action,
    entityType: operation.entityType,
    entityId: operation.entityId,
    metadata: operation.metadata,
    outcome,
    operationId,
  });

  await writeAuditLog(operation.actor, entry("pending"));

  let result: T;
  try {
    result = await execute();
  } catch (error) {
    if (!operation.isDefinitiveFailure?.(error)) {
      console.warn({
        event: "audit_operation_unresolved",
        action: operation.action,
        operation_id: operationId,
      });
      throw error;
    }
    try {
      await writeAuditLog(operation.actor, entry("failed"));
    } catch (auditError) {
      telemetry.captureException(auditError, {
        operation: "audit.record_failure",
        context: { action: operation.action },
      });
    }
    throw error;
  }

  try {
    await writeAuditLog(operation.actor, entry("succeeded"));
  } catch (auditError) {
    telemetry.captureException(auditError, {
      operation: "audit.record_success",
      level: "warning",
      context: { action: operation.action },
    });
  }
  return result;
}
