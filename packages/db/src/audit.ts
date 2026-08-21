import { createDb } from "./index";
import { auditLog } from "./schema/audit";

export type AuditLogInput = {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditLogInput) {
  const db = createDb();
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorEmail: input.actorEmail,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}
