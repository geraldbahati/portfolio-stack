import { describe, expect, it } from "vitest";

import { toPublishedCaseStudy, toPublishedProject } from "../schemas/published-project";

const base = {
  id: "webline-store",
  title: "Webline Store",
  description: "Edge storefront",
  src: "https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abc123/manifest/video.m3u8",
  type: "video" as const,
  poster: "https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abc123/thumbnails/thumbnail.jpg",
  alt: "Store",
  url: "https://webline.co.ke/store",
  badges: [{ text: "E-commerce", position: "bottom-left" as const }],
  aspectRatio: "16/9",
  sortOrder: 1,
};

describe("toPublishedProject", () => {
  it("keeps trusted stream sources and live site URLs", () => {
    expect(toPublishedProject(base)).toMatchObject({
      id: "webline-store",
      src: base.src,
      poster: base.poster,
      url: "https://webline.co.ke/store",
    });
  });

  it("drops records whose media host is untrusted", () => {
    expect(toPublishedProject({ ...base, src: "https://evil.example/video.mp4" })).toBeNull();
  });

  it("nulls an untrusted poster without dropping the card", () => {
    expect(
      toPublishedProject({ ...base, poster: "https://evil.example/poster.jpg" })?.poster,
    ).toBeNull();
  });
});

describe("toPublishedCaseStudy", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");

  it("keeps trusted R2 gallery and hero URLs", () => {
    const study = toPublishedCaseStudy({
      project: { ...base, createdAt, updatedAt: createdAt },
      details: {
        heroImage: "https://media.geraldbahati.dev/webline/store-01-hero.webp",
        heroAlt: "Hero",
        tagline: "Fast catalogue",
        fullDescription: "Body",
        services: ["Edge"],
        client: "Webline",
        industry: "Retail",
        period: "2026",
        year: 2026,
        features: ["PPR"],
        colorPalette: [{ hex: "#000", name: "Ink" }],
      },
      gallery: [
        {
          src: "https://media.geraldbahati.dev/webline/store-homepage-full.webp",
          alt: "Full page",
          caption: "Homepage",
          galleryType: "feature",
          width: 1400,
          height: 4000,
          deviceType: "full-width",
          sortOrder: 0,
        },
        {
          src: "https://evil.example/hack.webp",
          alt: "Bad",
          caption: null,
          galleryType: "stack",
          width: 800,
          height: 600,
          deviceType: "desktop",
          sortOrder: 1,
        },
      ],
      metrics: [{ value: "100%", label: "Prerendered", icon: "gauge", sortOrder: 0 }],
      challenges: [{ title: "Latency", content: "Fix it", sortOrder: 0 }],
      testimonial: null,
      previous: null,
      next: { id: "therapy-in-kenya", title: "Therapy in Kenya" },
    });

    expect(study?.details?.heroImage).toContain("media.geraldbahati.dev");
    expect(study?.gallery).toHaveLength(1);
    expect(study?.gallery[0]?.galleryType).toBe("feature");
    expect(study?.next?.id).toBe("therapy-in-kenya");
    expect(study?.project.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("drops the case study when the card media host is untrusted", () => {
    expect(
      toPublishedCaseStudy({
        project: {
          ...base,
          src: "https://evil.example/video.mp4",
          createdAt,
          updatedAt: createdAt,
        },
        details: null,
        gallery: [],
        metrics: [],
        challenges: [],
        testimonial: null,
        previous: null,
        next: null,
      }),
    ).toBeNull();
  });
});
