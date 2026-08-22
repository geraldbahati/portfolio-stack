import { and, desc, like, or, sql } from "drizzle-orm";

import { createDb } from "../index";
import { auditLog } from "../schema/audit";

type Database = ReturnType<typeof createDb>;
export type AdminActivityCategory = "all" | "project" | "message" | "media" | "settings" | "stream";

function escapeLike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function activityFilters(input: { search: string; category: AdminActivityCategory }) {
  const filters = [];
  if (input.search) {
    const pattern = `%${escapeLike(input.search)}%`;
    filters.push(
      or(
        sql<boolean>`${auditLog.action} like ${pattern} escape '\\'`,
        sql<boolean>`${auditLog.actorEmail} like ${pattern} escape '\\'`,
        sql<boolean>`${auditLog.entityId} like ${pattern} escape '\\'`,
      ),
    );
  }
  if (input.category !== "all") {
    filters.push(like(auditLog.action, `${input.category}.%`));
  }
  return filters.length > 0 ? and(...filters) : undefined;
}

export async function listAdminActivity(
  input: {
    search: string;
    category: AdminActivityCategory;
    page: number;
    pageSize: number;
  },
  db: Database = createDb(),
) {
  const where = activityFilters(input);
  const offset = (input.page - 1) * input.pageSize;
  const [items, counts] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(input.pageSize)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(auditLog).where(where),
  ]);
  const total = Number(counts[0]?.total ?? 0);
  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}
