import { and, asc, eq, isNotNull, lt, ne, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { createDb } from "./index";
import { type AuditOutcome, auditLog } from "./schema/audit";

type Database = ReturnType<typeof createDb>;

export type { AuditOutcome } from "./schema/audit";

/**
 * Who performed an audited action, plus the request it arrived on. Built once
 * from the request context so no audit write needs an extra lookup.
 */
export type AuditActor = {
  id: string | null;
  email: string;
  requestId?: string | null;
};

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  outcome?: AuditOutcome;
  operationId?: string | null;
  createdAt?: Date;
};

/** The single place an audit row is shaped, for batched and standalone writes alike. */
export function auditValues(actor: AuditActor, entry: AuditEntry): typeof auditLog.$inferInsert {
  return {
    id: crypto.randomUUID(),
    actorId: actor.id,
    actorEmail: actor.email,
    requestId: actor.requestId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata,
    outcome: entry.outcome ?? "succeeded",
    operationId: entry.operationId ?? null,
    ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
  };
}

export async function writeAuditLog(
  actor: AuditActor,
  entry: AuditEntry,
  db: Database = createDb(),
) {
  await db.insert(auditLog).values(auditValues(actor, entry));
}

export type PendingAuditOperation = {
  operationId: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

/**
 * Pending intents older than `olderThan` that never recorded an outcome, oldest
 * first. Served by the partial pending and operation indexes.
 */
export async function listStalePendingOperations(
  input: { olderThan: Date; limit: number },
  db: Database = createDb(),
): Promise<PendingAuditOperation[]> {
  const pending = alias(auditLog, "pending");
  const rows = await db
    .select()
    .from(pending)
    .where(
      and(
        eq(pending.outcome, "pending"),
        isNotNull(pending.operationId),
        lt(pending.createdAt, input.olderThan),
        notExists(
          db
            .select({ one: sql`1` })
            .from(auditLog)
            .where(
              and(eq(auditLog.operationId, pending.operationId), ne(auditLog.outcome, "pending")),
            ),
        ),
      ),
    )
    .orderBy(asc(pending.createdAt))
    .limit(input.limit);

  return rows.map((row) => ({
    operationId: row.operationId ?? "",
    actor: { id: row.actorId, email: row.actorEmail },
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
  }));
}
