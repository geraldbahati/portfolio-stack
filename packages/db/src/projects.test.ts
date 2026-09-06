import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({ createDb: vi.fn() }));

import { getPublishedProjectBySlug } from "./projects";
import { project, projectDetails, projectGallery, projectTestimonials } from "./schema/project";

type Database = NonNullable<Parameters<typeof getPublishedProjectBySlug>[1]>;
let client: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  db = drizzle(client);
  for (const file of ["0001_lethal_warhawk.sql", "0003_sticky_rhodey.sql"]) {
    await client.executeMultiple(
      await readFile(new URL(`./migrations/${file}`, import.meta.url), "utf8"),
    );
  }
  await db.insert(project).values([
    { id: "a", title: "A", sortOrder: 1, isPublished: true, src: "a", type: "video" },
    { id: "b", title: "B", sortOrder: 2, isPublished: true, src: "b", type: "video" },
    { id: "c", title: "C", sortOrder: 2, isPublished: true, src: "c", type: "video" },
    { id: "draft", title: "Draft", sortOrder: 2, isPublished: false, src: "draft", type: "video" },
    { id: "e", title: "E", sortOrder: 3, isPublished: true, src: "e", type: "video" },
  ]);
});

afterEach(() => client?.close());

function lookup(slug: string) {
  // The local SQLite adapter exercises the same Drizzle queries as D1.
  return getPublishedProjectBySlug(slug, db as unknown as Database);
}

describe("published project lookup", () => {
  it("keeps navigation stable for tied sort positions and excludes drafts", async () => {
    const middle = await lookup("c");
    expect(middle?.previous).toEqual({ id: "b", title: "B" });
    expect(middle?.next).toEqual({ id: "e", title: "E" });
    expect((await lookup("a"))?.previous).toBeNull();
    expect((await lookup("e"))?.next).toBeNull();
    expect((await lookup("b"))?.next).toEqual({ id: "c", title: "C" });
  });

  it("returns null for unpublished and missing records", async () => {
    expect(await lookup("draft")).toBeNull();
    expect(await lookup("missing")).toBeNull();
  });

  it("preserves optional relations and gallery order without multiplying rows", async () => {
    await db.insert(projectDetails).values({ projectId: "b", tagline: "Case study" });
    await db
      .insert(projectTestimonials)
      .values({ projectId: "b", quote: "Great", authorName: "Client" });
    await db.insert(projectGallery).values([
      {
        id: "later",
        projectId: "b",
        src: "later",
        galleryType: "feature",
        width: 100,
        height: 100,
        sortOrder: 2,
      },
      {
        id: "first",
        projectId: "b",
        src: "first",
        galleryType: "feature",
        width: 100,
        height: 100,
        sortOrder: 1,
      },
    ]);
    const result = await lookup("b");
    expect(result?.details?.tagline).toBe("Case study");
    expect(result?.testimonial?.quote).toBe("Great");
    expect(result?.gallery.map((image) => image.id)).toEqual(["first", "later"]);
    expect(result?.metrics).toEqual([]);
    expect((await lookup("a"))?.details).toBeNull();
    expect((await lookup("a"))?.testimonial).toBeNull();
  });
});
