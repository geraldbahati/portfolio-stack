import type { ServerTelemetry } from "@portfolio-stack/analytics/server";
import {
  listStalePendingOperations,
  type PendingAuditOperation,
  writeAuditLog,
} from "@portfolio-stack/db/audit";
import { env } from "@portfolio-stack/env/server";

import { getStreamVideoState } from "../stream/cloudflare";

type Verdict = "succeeded" | "failed" | "unknown";
type Verifier = (entityId: string) => Promise<Verdict>;

/** An intent younger than this may still be running. */
const STALE_AFTER_MS = 10 * 60_000;
/** After this long without a verdict, stop retrying and record the failure. */
const GIVE_UP_AFTER_MS = 24 * 60 * 60_000;
const BATCH_SIZE = 25;

/**
 * How to read each external operation's real outcome from the system it
 * changed. An action without a verifier is resolved only by giving up.
 */
const verifiers: Record<string, Verifier> = {
  "stream.delete": async (uid) => {
    const state = await getStreamVideoState(uid);
    if (state === "unknown") return "unknown";
    return state === "absent" ? "succeeded" : "failed";
  },
  "media.delete": async (key) => ((await env.MEDIA.head(key)) ? "failed" : "succeeded"),
  "media.upload": async (key) => ((await env.MEDIA.head(key)) ? "succeeded" : "failed"),
};

async function verify(operation: PendingAuditOperation): Promise<Verdict> {
  const verifier = verifiers[operation.action];
  if (!verifier || !operation.entityId) return "unknown";
  return verifier(operation.entityId);
}

/**
 * Resolve intents left open when a completion write failed or a Worker was
 * evicted mid-operation. Runs on a schedule; each run handles a bounded batch.
 */
export async function reconcileAuditedOperations(options: {
  telemetry: ServerTelemetry;
  now?: Date;
}) {
  const now = options.now ?? new Date();
  const pending = await listStalePendingOperations({
    olderThan: new Date(now.getTime() - STALE_AFTER_MS),
    limit: BATCH_SIZE,
  });

  const summary = { checked: pending.length, succeeded: 0, failed: 0, unresolved: 0 };

  for (const operation of pending) {
    const telemetry = options.telemetry.withContext({
      operation_id: operation.operationId,
      action: operation.action,
    });

    let verdict: Verdict;
    try {
      verdict = await verify(operation);
    } catch (error) {
      telemetry.captureException(error, { operation: "audit.reconcile.verify", level: "warning" });
      verdict = "unknown";
    }

    const expired = now.getTime() - operation.createdAt.getTime() > GIVE_UP_AFTER_MS;
    if (verdict === "unknown" && !expired) {
      summary.unresolved += 1;
      continue;
    }

    const outcome = verdict === "succeeded" ? "succeeded" : "failed";
    try {
      await writeAuditLog(operation.actor, {
        action: operation.action,
        entityType: operation.entityType,
        entityId: operation.entityId,
        operationId: operation.operationId,
        outcome,
        metadata: {
          ...operation.metadata,
          reconciled: true,
          ...(verdict === "unknown" ? { reason: "unverifiable" } : {}),
        },
      });
      summary[outcome] += 1;
    } catch (error) {
      telemetry.captureException(error, { operation: "audit.reconcile.record" });
      summary.unresolved += 1;
    }
  }

  console.log({ event: "audit_reconciliation", ...summary });
  return summary;
}
