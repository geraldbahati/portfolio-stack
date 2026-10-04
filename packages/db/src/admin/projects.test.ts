import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../index", () => ({ createDb: vi.fn() }));

import { listPublishedProjects } from "../projects";
import { project } from "../schema/project";
import { createMemoryDb } from "../testing/memory-db";
import {
  replaceAdminProjectChallenges,
  replaceAdminProjectGallery,
  replaceAdminProjectMetrics,
  saveAdminProjectPresentation,
  saveAdminProjectTestimonial,
} from "./projects";

type Database = NonNullable<Parameters<typeof replaceAdminProjectMetrics>[3]>;
let client: Awaited<ReturnType<typeof createMemoryDb>>["client"];
let database: Database;
const actor = { id: "user-1", email: "admin@example.com", requestId: "req-1" };
const original = new Date("2026-01-01T00:00:00Z");
const edited = new Date("2026-09-06T12:00:00Z");

beforeEach(async () => {
  ({ client, db: database } = await createMemoryDb());
  await database.insert(project).values(
    ["edited", "untouched"].map((id) => ({
      id,
      title: id,
      src: "poster.webp",
      type: "gif" as const,
      sortOrder: 0,
      isPublished: true,
      createdAt: original,
      updatedAt: original,
    })),
  );
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(edited);
});

afterEach(() => {
  vi.useRealTimers();
  client?.close();
});

const mutations: Array<[string, (db: Database) => Promise<unknown>]> = [
  [
    "metrics",
    (db) =>
      replaceAdminProjectMetrics(
        "edited",
        [{ value: "10", label: "Tests", icon: null }],
        actor,
        db,
      ),
  ],
  ["remove metrics", (db) => replaceAdminProjectMetrics("edited", [], actor, db)],
  [
    "challenges",
    (db) =>
      replaceAdminProjectChallenges(
        "edited",
        [{ title: "Challenge", content: "Solution" }],
        actor,
        db,
      ),
  ],
  ["remove challenges", (db) => replaceAdminProjectChallenges("edited", [], actor, db)],
  [
    "gallery",
    (db) =>
      replaceAdminProjectGallery(
        "edited",
        [
          {
            src: "photo.webp",
            alt: "Example",
            caption: null,
            galleryType: "feature",
            width: 100,
            height: 100,
            deviceType: null,
          },
        ],
        actor,
        db,
      ),
  ],
  ["remove gallery", (db) => replaceAdminProjectGallery("edited", [], actor, db)],
  [
    "testimonial",
    (db) =>
      saveAdminProjectTestimonial(
        "edited",
        {
          quote: "Delivered",
          authorName: "Client",
          authorRole: null,
          authorCompany: null,
          authorImage: null,
        },
        actor,
        db,
      ),
  ],
  ["remove testimonial", (db) => saveAdminProjectTestimonial("edited", null, actor, db)],
  [
    "presentation",
    (db) =>
      saveAdminProjectPresentation(
        "edited",
        { colorPalette: [], relatedProjectIds: [] },
        actor,
        db,
      ),
  ],
];

describe("case-study freshness", () => {
  it.each(mutations)(
    "%s edits update the public timestamp without changing creation or other projects",
    async (_name, mutate) => {
      const db = database;
      await mutate(db);
      const rows = await listPublishedProjects(db);
      expect(rows.find((row) => row.id === "edited")).toMatchObject({
        createdAt: original,
        updatedAt: edited,
      });
      expect(rows.find((row) => row.id === "untouched")?.updatedAt).toEqual(original);
    },
  );
});
