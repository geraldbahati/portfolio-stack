import { and, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";

import { createDb } from "../index";
import { auditLog } from "../schema/audit";
import { type ContactSubmissionStatus, contactSubmission } from "../schema/contact";

type Database = ReturnType<typeof createDb>;

export type AdminMessageStatus = "all" | ContactSubmissionStatus;
export type AdminMessageView = "inbox" | "archived" | "all";
export type AdminMessageReadState = "all" | "read" | "unread";

function messageFilters(input: {
  search: string;
  status: AdminMessageStatus;
  view: AdminMessageView;
  read: AdminMessageReadState;
}) {
  const filters = [];

  if (input.search) {
    const escaped = input.search
      .replaceAll("\\", "\\\\")
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_");
    const pattern = `%${escaped}%`;
    filters.push(
      or(
        sql<boolean>`${contactSubmission.name} like ${pattern} escape '\\'`,
        sql<boolean>`${contactSubmission.email} like ${pattern} escape '\\'`,
        sql<boolean>`${contactSubmission.message} like ${pattern} escape '\\'`,
      ),
    );
  }

  if (input.status !== "all") filters.push(eq(contactSubmission.status, input.status));
  if (input.view === "inbox") filters.push(isNull(contactSubmission.archivedAt));
  if (input.view === "archived") filters.push(isNotNull(contactSubmission.archivedAt));
  if (input.read === "read") filters.push(isNotNull(contactSubmission.readAt));
  if (input.read === "unread") filters.push(isNull(contactSubmission.readAt));

  return filters.length > 0 ? and(...filters) : undefined;
}

export async function listAdminMessages(
  input: {
    search: string;
    status: AdminMessageStatus;
    view: AdminMessageView;
    read: AdminMessageReadState;
    page: number;
    pageSize: number;
  },
  db: Database = createDb(),
) {
  const where = messageFilters(input);
  const offset = (input.page - 1) * input.pageSize;
  const [rows, counts, summary] = await Promise.all([
    db
      .select({
        id: contactSubmission.id,
        name: contactSubmission.name,
        email: contactSubmission.email,
        preview: sql<string>`substr(${contactSubmission.message}, 1, 240)`,
        status: contactSubmission.status,
        readAt: contactSubmission.readAt,
        archivedAt: contactSubmission.archivedAt,
        createdAt: contactSubmission.createdAt,
      })
      .from(contactSubmission)
      .where(where)
      .orderBy(desc(contactSubmission.createdAt), desc(contactSubmission.id))
      .limit(input.pageSize)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(contactSubmission).where(where),
    db
      .select({
        total: sql<number>`count(*)`,
        inbox: sql<number>`sum(case when ${contactSubmission.archivedAt} is null then 1 else 0 end)`,
        unread: sql<number>`sum(case when ${contactSubmission.archivedAt} is null and ${contactSubmission.readAt} is null then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${contactSubmission.archivedAt} is null and ${contactSubmission.status} = 'failed' then 1 else 0 end)`,
        archived: sql<number>`sum(case when ${contactSubmission.archivedAt} is not null then 1 else 0 end)`,
      })
      .from(contactSubmission),
  ]);

  const total = Number(counts[0]?.total ?? 0);
  return {
    items: rows,
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    summary: {
      total: Number(summary[0]?.total ?? 0),
      inbox: Number(summary[0]?.inbox ?? 0),
      unread: Number(summary[0]?.unread ?? 0),
      failed: Number(summary[0]?.failed ?? 0),
      archived: Number(summary[0]?.archived ?? 0),
    },
  };
}

export async function getAdminMessage(id: string, db: Database = createDb()) {
  const rows = await db
    .select()
    .from(contactSubmission)
    .where(eq(contactSubmission.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function setAdminMessageRead(
  id: string,
  read: boolean,
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  return db.batch([
    db
      .update(contactSubmission)
      .set({ readAt: read ? now : null })
      .where(eq(contactSubmission.id, id)),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: read ? "message.read" : "message.unread",
      entityType: "contact_submission",
      entityId: id,
      createdAt: now,
    }),
  ]);
}

export async function setAdminMessageArchived(
  id: string,
  archived: boolean,
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  return db.batch([
    db
      .update(contactSubmission)
      .set({ archivedAt: archived ? now : null })
      .where(eq(contactSubmission.id, id)),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: archived ? "message.archive" : "message.restore",
      entityType: "contact_submission",
      entityId: id,
      createdAt: now,
    }),
  ]);
}

export async function deleteAdminMessage(
  id: string,
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  return db.batch([
    db.delete(contactSubmission).where(eq(contactSubmission.id, id)),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: "message.delete",
      entityType: "contact_submission",
      entityId: id,
      createdAt: now,
    }),
  ]);
}
