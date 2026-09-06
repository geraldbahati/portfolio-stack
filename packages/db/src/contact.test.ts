import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  recordContactEmailAccepted,
  recordContactSendFailure,
  reserveContactSubmission,
  updateContactStatusByEmailId,
} from "./contact";
import type { createDb } from "./index";

vi.mock("@portfolio-stack/env/server", () => ({ env: {} }));

const now = Date.UTC(2026, 8, 5, 12);
const input = {
  id: "inquiry-1",
  name: "Test Sender",
  email: "sender@example.com",
  message: "I would like to discuss a project.",
  perEmailLimit: 3,
  globalLimit: 30,
  now,
};

describe("contact persistence", () => {
  let client: ReturnType<typeof createClient>;
  let db: ReturnType<typeof createDb>;

  beforeEach(async () => {
    client = createClient({ url: ":memory:" });
    // Both drivers execute SQLite statements; use real SQLite to exercise the
    // conditional INSERT and UPDATE rather than mocking their query builders.
    db = drizzle(client) as unknown as ReturnType<typeof createDb>;
    await client.execute(`CREATE TABLE contact_submission (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
      message TEXT NOT NULL, email_id TEXT, status TEXT NOT NULL,
      read_at INTEGER, archived_at INTEGER, created_at INTEGER NOT NULL
    )`);
  });

  afterEach(() => client.close());

  it("reserves only the remaining per-email quota during concurrent requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        reserveContactSubmission(
          { ...input, id: `inquiry-${index}`, message: `Different message ${index}` },
          db,
        ),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
  });

  it("enforces the global quota across simultaneous different senders", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        reserveContactSubmission(
          { ...input, id: `inquiry-${index}`, email: `${index}@example.com`, globalLimit: 2 },
          db,
        ),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(2);
  });

  it("reuses one persisted submission for simultaneous identical requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        reserveContactSubmission({ ...input, id: `inquiry-${index}`, globalLimit: 1 }, db),
      ),
    );
    expect(new Set(results.map((row) => row?.id)).size).toBe(1);
    expect(results.every((row) => row?.createdAt.getTime() === now)).toBe(true);
    expect(
      (await client.execute("SELECT count(*) AS count FROM contact_submission")).rows[0],
    ).toMatchObject({ count: 1 });
  });

  it("accepts a new identical inquiry after the deduplication window", async () => {
    await reserveContactSubmission(input, db);
    const later = await reserveContactSubmission(
      { ...input, id: "later", now: now + 3_600_001 },
      db,
    );
    expect(later?.id).toBe("later");
  });

  it("keeps delivery and terminal failure from regressing under stale webhooks", async () => {
    await reserveContactSubmission(input, db);
    await recordContactEmailAccepted(input.id, "email-1", db);
    await updateContactStatusByEmailId("email-1", "delivered", db);
    await updateContactStatusByEmailId("email-1", "sent", db);
    expect((await client.execute("SELECT status FROM contact_submission")).rows[0]?.status).toBe(
      "delivered",
    );
    await updateContactStatusByEmailId("email-1", "failed", db);
    await Promise.all([
      updateContactStatusByEmailId("email-1", "delivered", db),
      updateContactStatusByEmailId("email-1", "sent", db),
      recordContactEmailAccepted(input.id, "email-1", db),
    ]);
    expect((await client.execute("SELECT status FROM contact_submission")).rows[0]?.status).toBe(
      "failed",
    );
  });

  it("recovers an ambiguous send failure but does not overwrite an accepted send", async () => {
    await reserveContactSubmission(input, db);
    await recordContactSendFailure(input.id, db);
    await recordContactEmailAccepted(input.id, "email-1", db);
    await recordContactSendFailure(input.id, db);
    expect(
      (await client.execute("SELECT status, email_id FROM contact_submission")).rows[0],
    ).toMatchObject({ status: "sent", email_id: "email-1" });
    await expect(updateContactStatusByEmailId("unknown", "sent", db)).resolves.toBe(false);
  });
});
