import { describe, expect, it } from "vitest";

import { IMAGE_PRESETS } from "./image-presets";
import { projectOgImage, r2OptimizedImage } from "./remote-image";

describe("r2OptimizedImage", () => {
  it("builds AVIF/WebP srcsets through /cdn-cgi/image", () => {
    const image = r2OptimizedImage(
      "https://media.geraldbahati.dev/webline/store-01-hero.webp",
      IMAGE_PRESETS.projectHero,
      { width: 2400, height: 1021 },
      "media.geraldbahati.dev",
      { fit: "cover" },
    );

    expect(image?.sources.map((source) => source.type)).toEqual(["image/avif", "image/webp"]);
    expect(image?.preload.type).toBe("image/avif");
    expect(image?.src).toContain("/cdn-cgi/image/");
    expect(image?.src).toContain("format=webp");
  });

  it("rejects non-R2 hosts", () => {
    expect(
      r2OptimizedImage(
        "https://evil.example/x.webp",
        IMAGE_PRESETS.projectHero,
        { width: 800, height: 400 },
        "media.geraldbahati.dev",
      ),
    ).toBeNull();
  });
});

describe("projectOgImage", () => {
  it("crops R2 heroes to 1200x630 jpeg", () => {
    expect(
      projectOgImage(
        "https://media.geraldbahati.dev/webline/store-01-hero.webp",
        "media.geraldbahati.dev",
      ),
    ).toContain("width=1200,height=630,fit=cover");
  });
});
