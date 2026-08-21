import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type ContactSubmissionStatus = "pending" | "sent" | "delivered" | "failed";

export const contactSubmission = sqliteTable(
  "contact_submission",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    emailId: text("email_id"),
    status: text("status").$type<ContactSubmissionStatus>().notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("contact_submission_email_idx").on(table.email),
    index("contact_submission_created_idx").on(table.createdAt),
    index("contact_submission_status_idx").on(table.status),
    index("contact_submission_email_id_idx").on(table.emailId),
  ],
);
