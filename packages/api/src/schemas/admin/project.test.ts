import { describe, expect, it } from "vitest";

import {
  adminProjectIdSchema,
  adminProjectWriteSchema,
  canReplaceCollection,
  projectPublishIssues,
} from "./project";

describe("admin project validation", () => {
  it("accepts canonical slugs and rejects unsafe identifiers", () => {
    expect(adminProjectIdSchema.safeParse("therapy-in-kenya").success).toBe(true);
    expect(adminProjectIdSchema.safeParse("Therapy In Kenya").success).toBe(false);
    expect(adminProjectIdSchema.safeParse("../admin").success).toBe(false);
  });

  it("reports every missing publishing requirement", () => {
    const issues = projectPublishIssues({
      project: { title: "Draft", description: null, src: "https://example.com/file", alt: null },
      details: null,
    });

    expect(issues).toEqual([
      "Add a project summary.",
      "Add a valid project media URL.",
      "Add descriptive media alt text.",
      "Add a case-study tagline.",
      "Add the full case-study description.",
      "Add at least one service.",
    ]);
  });

  it("allows complete projects to publish", () => {
    expect(
      projectPublishIssues({
        project: {
          title: "Complete project",
          description: "A useful summary",
          src: "https://media.geraldbahati.dev/project.webp",
          alt: "Project homepage shown on desktop",
        },
        details: {
          tagline: "A faster platform",
          fullDescription: "The full case study.",
          services: ["Engineering"],
        },
      }),
    ).toEqual([]);
  });

  it("rejects non-HTTPS public project links", () => {
    const result = adminProjectWriteSchema.safeParse({
      id: "secure-project",
      title: "Secure project",
      description: null,
      src: "https://media.geraldbahati.dev/project.webp",
      type: "gif",
      poster: null,
      alt: null,
      url: "http://example.com",
      badges: [],
      aspectRatio: "16/9",
      sortOrder: 0,
      details: {
        tagline: null,
        fullDescription: null,
        services: [],
        client: null,
        industry: null,
        period: null,
        year: null,
        features: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires exact confirmation before clearing a populated collection", () => {
    expect(
      canReplaceCollection({
        currentCount: 3,
        nextCount: 0,
        confirmation: "",
        projectId: "secure-project",
      }),
    ).toBe(false);
    expect(
      canReplaceCollection({
        currentCount: 3,
        nextCount: 0,
        confirmation: "secure-project",
        projectId: "secure-project",
      }),
    ).toBe(true);
    expect(
      canReplaceCollection({
        currentCount: 3,
        nextCount: 1,
        confirmation: "",
        projectId: "secure-project",
      }),
    ).toBe(true);
  });
});
