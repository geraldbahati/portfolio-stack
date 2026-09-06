import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { createDb } from "./index";
import { type ContactSubmissionStatus, contactSubmission } from "./schema/contact";

export { type ContactSubmissionStatus, contactSubmission };

const HOUR_MS = 60 * 60 * 1000;

// The quota checks and duplicate check must share the INSERT statement: separate
// reads allow simultaneous requests to pass the same remaining quota slot.
export async function reserveContactSubmission(
  input: {
    id: string;
    name: string;
    email: string;
    message: string;
    perEmailLimit: number;
    globalLimit: number;
    now?: number;
  },
  db: ReturnType<typeof createDb> = createDb(),
) {
  const now = input.now ?? Date.now();
  const since = now - HOUR_MS;
  await db.run(sql`
    INSERT INTO contact_submission (id, name, email, message, status, created_at)
    SELECT ${input.id}, ${input.name}, ${input.email}, ${input.message}, 'pending', ${now}
    WHERE (SELECT count(*) FROM contact_submission WHERE created_at >= ${since}) < ${input.globalLimit}
      AND (SELECT count(*) FROM contact_submission WHERE created_at >= ${since} AND email = ${input.email}) < ${input.perEmailLimit}
      AND NOT EXISTS (
        SELECT 1 FROM contact_submission
        WHERE created_at >= ${since} AND email = ${input.email}
          AND name = ${input.name} AND message = ${input.message}
      )
  `);

  // Return the original row on a retry, including its ID and timestamp, so the
  // email provider receives the same idempotency key and identical payload.
  const [submission] = await db
    .select()
    .from(contactSubmission)
    .where(
      and(
        gte(contactSubmission.createdAt, new Date(since)),
        eq(contactSubmission.email, input.email),
        eq(contactSubmission.name, input.name),
        eq(contactSubmission.message, input.message),
      ),
    )
    .limit(1);
  return submission ?? null;
}

export async function recordContactEmailAccepted(
  id: string,
  emailId: string,
  db: ReturnType<typeof createDb> = createDb(),
) {
  return db
    .update(contactSubmission)
    .set({
      emailId,
      // A concurrent retry must not downgrade a status already set by a webhook.
      status: sql`CASE WHEN ${contactSubmission.emailId} IS NULL THEN 'sent' ELSE ${contactSubmission.status} END`,
    })
    .where(eq(contactSubmission.id, id));
}

export async function recordContactSendFailure(
  id: string,
  db: ReturnType<typeof createDb> = createDb(),
) {
  return db
    .update(contactSubmission)
    .set({ status: "failed" })
    .where(and(eq(contactSubmission.id, id), sql`${contactSubmission.emailId} IS NULL`));
}

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

  // Delivery webhooks may be duplicated, concurrent, or out of order. A failure
  // (including a later bounce) is terminal; a stale sent event cannot downgrade
  // delivery. Keep this condition inside the UPDATE to avoid read/write races.
  const predecessors: Record<ContactSubmissionStatus, ContactSubmissionStatus[]> = {
    pending: [],
    sent: ["pending"],
    delivered: ["pending", "sent"],
    failed: ["pending", "sent", "delivered"],
  };
  if (predecessors[status].length > 0) {
    await db
      .update(contactSubmission)
      .set({ status })
      .where(
        and(
          eq(contactSubmission.id, row.id),
          inArray(contactSubmission.status, predecessors[status]),
        ),
      );
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
