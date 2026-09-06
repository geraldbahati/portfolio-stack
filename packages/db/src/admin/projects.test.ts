import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../index", () => ({ createDb: vi.fn() }));

import { listPublishedProjects } from "../projects";
import { project } from "../schema/project";
import {
  replaceAdminProjectChallenges,
  replaceAdminProjectGallery,
  replaceAdminProjectMetrics,
  saveAdminProjectPresentation,
  saveAdminProjectTestimonial,
} from "./projects";

type Database = NonNullable<Parameters<typeof replaceAdminProjectMetrics>[3]>;
let client: ReturnType<typeof createClient>;
let database: ReturnType<typeof drizzle>;
const original = new Date("2026-01-01T00:00:00Z");
const edited = new Date("2026-09-06T12:00:00Z");

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  database = drizzle(client);
  for (const file of [
    "0000_motionless_korg.sql",
    "0001_lethal_warhawk.sql",
    "0003_sticky_rhodey.sql",
  ]) {
    await client.executeMultiple(
      await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  }
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
        "admin",
        db,
      ),
  ],
  ["remove metrics", (db) => replaceAdminProjectMetrics("edited", [], "admin", db)],
  [
    "challenges",
    (db) =>
      replaceAdminProjectChallenges(
        "edited",
        [{ title: "Challenge", content: "Solution" }],
        "admin",
        db,
      ),
  ],
  ["remove challenges", (db) => replaceAdminProjectChallenges("edited", [], "admin", db)],
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
        "admin",
        db,
      ),
  ],
  ["remove gallery", (db) => replaceAdminProjectGallery("edited", [], "admin", db)],
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
        "admin",
        db,
      ),
  ],
  ["remove testimonial", (db) => saveAdminProjectTestimonial("edited", null, "admin", db)],
  [
    "presentation",
    (db) =>
      saveAdminProjectPresentation(
        "edited",
        { colorPalette: [], relatedProjectIds: [] },
        "admin",
        db,
      ),
  ],
];

describe("case-study freshness", () => {
  it.each(mutations)(
    "%s edits update the public timestamp without changing creation or other projects",
    async (_name, mutate) => {
      const db = database as unknown as Database;
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
