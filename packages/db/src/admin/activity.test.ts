import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../index", () => ({ createDb: vi.fn() }));

import { auditValues, listStalePendingOperations } from "../audit";
import { auditLog } from "../schema/audit";
import { createMemoryDb } from "../testing/memory-db";
import { type AdminActivityQuery, listAdminActivity } from "./activity";

type Memory = Awaited<ReturnType<typeof createMemoryDb>>;
let memory: Memory;

const actor = { id: "user-1", email: "admin@example.com", requestId: "req-1" };
const base: AdminActivityQuery = {
  search: "",
  category: "all",
  direction: "older",
  pageSize: 2,
  includeTotal: false,
};

beforeEach(async () => {
  memory = await createMemoryDb();
  // Five events, one minute apart, newest last. 2026-10-01 09:00 UTC is noon in Nairobi.
  await memory.db.insert(auditLog).values(
    Array.from({ length: 5 }, (_, index) => ({
      ...auditValues(actor, {
        action: index % 2 === 0 ? "project.update" : "media.upload",
        entityType: "project",
        entityId: `entity-${index}`,
        createdAt: new Date(Date.UTC(2026, 9, 1, 9, index)),
      }),
      id: `event-${index}`,
    })),
  );
});

afterEach(() => {
  memory.client.close();
});

describe("listAdminActivity", () => {
  it("pages from newest to oldest with keyset cursors", async () => {
    const first = await listAdminActivity(base, memory.db);
    expect(first.items.map((item) => item.id)).toEqual(["event-4", "event-3"]);
    expect(first.newerCursor).toBeNull();
    expect(first.total).toBeNull();

    const second = await listAdminActivity({ ...base, cursor: first.olderCursor ?? "" }, memory.db);
    expect(second.items.map((item) => item.id)).toEqual(["event-2", "event-1"]);

    const third = await listAdminActivity({ ...base, cursor: second.olderCursor ?? "" }, memory.db);
    expect(third.items.map((item) => item.id)).toEqual(["event-0"]);
    expect(third.olderCursor).toBeNull();

    const back = await listAdminActivity(
      { ...base, cursor: third.newerCursor ?? "", direction: "newer" },
      memory.db,
    );
    expect(back.items.map((item) => item.id)).toEqual(["event-2", "event-1"]);
    expect(back.newerCursor).not.toBeNull();
  });

  it("counts only when asked", async () => {
    const result = await listAdminActivity(
      { ...base, category: "project", includeTotal: true },
      memory.db,
    );
    expect(result.total).toBe(3);
  });

  it("filters by inclusive Nairobi calendar dates", async () => {
    expect(
      (await listAdminActivity({ ...base, from: "2026-10-01", to: "2026-10-01" }, memory.db)).items,
    ).toHaveLength(2);
    expect(
      (await listAdminActivity({ ...base, from: "2026-10-02" }, memory.db)).items,
    ).toHaveLength(0);
  });

  it("matches correlation identifiers exactly", async () => {
    const result = await listAdminActivity({ ...base, search: "req-1", pageSize: 10 }, memory.db);
    expect(result.items).toHaveLength(5);
  });

  it("ignores a malformed cursor instead of failing", async () => {
    const result = await listAdminActivity({ ...base, cursor: "1'; drop table" }, memory.db);
    expect(result.items.map((item) => item.id)).toEqual(["event-4", "event-3"]);
  });
});

describe("listStalePendingOperations", () => {
  it("returns old intents that never recorded an outcome", async () => {
    const old = new Date("2026-10-01T00:00:00Z");
    await memory.db.insert(auditLog).values([
      auditValues(actor, {
        action: "stream.delete",
        entityType: "stream_video",
        entityId: "video-open",
        outcome: "pending",
        operationId: "op-open",
        createdAt: old,
      }),
      auditValues(actor, {
        action: "stream.delete",
        entityType: "stream_video",
        entityId: "video-done",
        outcome: "pending",
        operationId: "op-done",
        createdAt: old,
      }),
      auditValues(actor, {
        action: "stream.delete",
        entityType: "stream_video",
        entityId: "video-done",
        outcome: "succeeded",
        operationId: "op-done",
        createdAt: old,
      }),
      auditValues(actor, {
        action: "stream.delete",
        entityType: "stream_video",
        entityId: "video-recent",
        outcome: "pending",
        operationId: "op-recent",
        createdAt: new Date("2026-10-04T00:00:00Z"),
      }),
    ]);

    const stale = await listStalePendingOperations(
      { olderThan: new Date("2026-10-02T00:00:00Z"), limit: 10 },
      memory.db,
    );
    expect(stale.map((operation) => operation.operationId)).toEqual(["op-open"]);
    expect(stale[0]?.actor).toEqual({ id: "user-1", email: "admin@example.com" });
  });
});
