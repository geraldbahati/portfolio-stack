import { describe, expect, it } from "vitest";

import { SEED_CASE_STUDIES } from "./case-studies";
import { SEED_PROJECTS } from "./projects";

describe("SEED_PROJECTS", () => {
  it("publishes the three live homepage cards in order", () => {
    expect(SEED_PROJECTS.map((entry) => entry.id)).toEqual([
      "webline-technologies",
      "webline-store",
      "therapy-in-kenya",
    ]);
    expect(SEED_PROJECTS.every((entry) => entry.isPublished)).toBe(true);
    expect(SEED_PROJECTS.every((entry) => entry.type === "video")).toBe(true);
    expect(SEED_PROJECTS.every((entry) => entry.src.includes("cloudflarestream.com"))).toBe(true);
  });
});

describe("SEED_CASE_STUDIES", () => {
  it("covers every seeded card with hero, gallery, metrics and challenges", () => {
    expect(SEED_CASE_STUDIES.map((study) => study.projectId)).toEqual(
      SEED_PROJECTS.map((entry) => entry.id),
    );
    expect(
      SEED_CASE_STUDIES.every(
        (study) =>
          study.details.heroImage.startsWith("https://media.geraldbahati.dev/") &&
          study.gallery.some((item) => item.galleryType === "feature") &&
          study.gallery.some((item) => item.galleryType === "stack") &&
          study.metrics.length > 0 &&
          study.challenges.length > 0,
      ),
    ).toBe(true);
  });
});
