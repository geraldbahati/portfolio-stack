import { and, asc, desc, eq, gt, gte, like, lt, or, type SQL, sql } from "drizzle-orm";

import { createDb } from "../index";
import { auditLog } from "../schema/audit";

type Database = ReturnType<typeof createDb>;
export type AdminActivityCategory =
  | "all"
  | "auth"
  | "project"
  | "message"
  | "media"
  | "settings"
  | "stream";

export type AdminActivityDirection = "older" | "newer";

export type AdminActivityQuery = {
  search: string;
  category: AdminActivityCategory;
  /** Inclusive calendar dates (YYYY-MM-DD) in the admin's time zone. */
  from?: string;
  to?: string;
  cursor?: string;
  direction: AdminActivityDirection;
  pageSize: number;
  /** An exact count scans every matching row, so callers opt in. */
  includeTotal: boolean;
};

/** Dates in the activity view are entered and displayed in Nairobi time (UTC+3, no DST). */
const ACTIVITY_UTC_OFFSET = "+03:00";
const DAY_MS = 86_400_000;
const CURSOR_PATTERN = /^(\d{1,15}):([A-Za-z0-9_-]{1,64})$/;

type Cursor = { createdAt: Date; id: string };

export function encodeActivityCursor(row: { createdAt: Date; id: string }) {
  return `${row.createdAt.getTime()}:${row.id}`;
}

export function decodeActivityCursor(value: string | undefined): Cursor | null {
  const match = value ? CURSOR_PATTERN.exec(value) : null;
  if (!match?.[1] || !match[2]) return null;
  return { createdAt: new Date(Number(match[1])), id: match[2] };
}

function startOfDay(date: string) {
  const time = Date.parse(`${date}T00:00:00${ACTIVITY_UTC_OFFSET}`);
  return Number.isNaN(time) ? null : new Date(time);
}

function escapeLike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function activityFilters(input: AdminActivityQuery) {
  const filters: SQL[] = [];
  if (input.search) {
    const pattern = `%${escapeLike(input.search)}%`;
    const search = or(
      sql<boolean>`${auditLog.action} like ${pattern} escape '\\'`,
      sql<boolean>`${auditLog.actorEmail} like ${pattern} escape '\\'`,
      sql<boolean>`${auditLog.entityId} like ${pattern} escape '\\'`,
      eq(auditLog.operationId, input.search),
      eq(auditLog.requestId, input.search),
    );
    if (search) filters.push(search);
  }
  if (input.category !== "all") {
    filters.push(like(auditLog.action, `${input.category}.%`));
  }
  // The date range bounds the created_at index scan, which keeps substring
  // search affordable as the history grows.
  const from = input.from ? startOfDay(input.from) : null;
  if (from) filters.push(gte(auditLog.createdAt, from));
  const to = input.to ? startOfDay(input.to) : null;
  if (to) filters.push(lt(auditLog.createdAt, new Date(to.getTime() + DAY_MS)));
  return filters;
}

function keyset(cursor: Cursor, direction: AdminActivityDirection) {
  const compare = direction === "older" ? lt : gt;
  return or(
    compare(auditLog.createdAt, cursor.createdAt),
    and(eq(auditLog.createdAt, cursor.createdAt), compare(auditLog.id, cursor.id)),
  );
}

/**
 * Keyset pagination over (created_at, id), newest first. The cost of a page
 * depends on the page size, not on how deep into the history it is.
 */
export async function listAdminActivity(input: AdminActivityQuery, db: Database = createDb()) {
  const filters = activityFilters(input);
  const cursor = decodeActivityCursor(input.cursor);
  const direction = cursor ? input.direction : "older";
  const position = cursor ? keyset(cursor, direction) : undefined;
  const where = and(...filters, position);
  const order =
    direction === "older"
      ? [desc(auditLog.createdAt), desc(auditLog.id)]
      : [asc(auditLog.createdAt), asc(auditLog.id)];

  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(...order)
      .limit(input.pageSize + 1),
    input.includeTotal
      ? db
          .select({ total: sql<number>`count(*)` })
          .from(auditLog)
          .where(and(...filters))
      : Promise.resolve(null),
  ]);

  const hasMore = rows.length > input.pageSize;
  const page = rows.slice(0, input.pageSize);
  const items = direction === "older" ? page : page.reverse();
  const first = items[0];
  const last = items.at(-1);

  // Coming from a cursor means rows exist on the side we came from.
  const hasOlder = direction === "older" ? hasMore : Boolean(cursor);
  const hasNewer = direction === "newer" ? hasMore : Boolean(cursor);

  return {
    items,
    pageSize: input.pageSize,
    olderCursor: hasOlder && last ? encodeActivityCursor(last) : null,
    newerCursor: hasNewer && first ? encodeActivityCursor(first) : null,
    total: counts ? Number(counts[0]?.total ?? 0) : null,
  };
}
