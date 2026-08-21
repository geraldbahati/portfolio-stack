import { and, eq, gte, sql } from "drizzle-orm";

import { createDb } from "./index";
import { type ContactSubmissionStatus, contactSubmission } from "./schema/contact";

export { type ContactSubmissionStatus, contactSubmission };

const HOUR_MS = 60 * 60 * 1000;

export function insertContactSubmission(
  input: {
    id: string;
    name: string;
    email: string;
    message: string;
    status?: ContactSubmissionStatus;
    emailId?: string;
  },
  db: ReturnType<typeof createDb> = createDb(),
) {
  return db.insert(contactSubmission).values({
    id: input.id,
    name: input.name,
    email: input.email,
    message: input.message,
    status: input.status ?? "pending",
    emailId: input.emailId,
  });
}

export function updateContactSubmission(
  id: string,
  patch: { status?: ContactSubmissionStatus; emailId?: string },
  db: ReturnType<typeof createDb> = createDb(),
) {
  return db.update(contactSubmission).set(patch).where(eq(contactSubmission.id, id));
}

export async function updateContactStatusByEmailId(
  emailId: string,
  status: ContactSubmissionStatus,
  db: ReturnType<typeof createDb> = createDb(),
) {
  const [row] = await db
    .select({ id: contactSubmission.id, status: contactSubmission.status })
    .from(contactSubmission)
    .where(eq(contactSubmission.emailId, emailId))
    .limit(1);

  if (!row) {
    return false;
  }

  if (row.status !== status) {
    await db.update(contactSubmission).set({ status }).where(eq(contactSubmission.id, row.id));
  }

  return true;
}

export async function countRecentContactSubmissions(
  options: { email?: string; sinceMs?: number } = {},
  db: ReturnType<typeof createDb> = createDb(),
) {
  const since = new Date(options.sinceMs ?? Date.now() - HOUR_MS);
  const filters = [gte(contactSubmission.createdAt, since)];
  if (options.email) {
    filters.push(eq(contactSubmission.email, options.email));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactSubmission)
    .where(and(...filters));

  return Number(row?.count ?? 0);
}
