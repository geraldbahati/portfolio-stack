import { describe, expect, it } from "vitest";

import { buildPreload, buildSources, fitWidths, srcsetFor } from "./image-presets";

describe("fitWidths", () => {
  it("does not upscale past the source and de-dupes", () => {
    expect(fitWidths([640, 960, 1280, 1920], 1792)).toEqual([640, 960, 1280, 1792]);
    expect(fitWidths([80, 160], 80)).toEqual([80]);
  });
});

describe("srcset / picture helpers", () => {
  it("builds density-independent srcset strings and AVIF-first sources", () => {
    const avif = [
      { url: "/a-640.avif", width: 640 },
      { url: "/a-1280.avif", width: 1280 },
    ];
    const webp = [
      { url: "/a-640.webp", width: 640 },
      { url: "/a-1280.webp", width: 1280 },
    ];

    expect(srcsetFor(avif)).toBe("/a-640.avif 640w, /a-1280.avif 1280w");
    expect(buildSources({ avif, webp })).toEqual([
      { type: "image/avif", srcset: "/a-640.avif 640w, /a-1280.avif 1280w" },
      { type: "image/webp", srcset: "/a-640.webp 640w, /a-1280.webp 1280w" },
    ]);
    expect(buildPreload(avif, "image/avif", "100vw")).toEqual({
      href: "/a-1280.avif",
      type: "image/avif",
      imagesrcset: "/a-640.avif 640w, /a-1280.avif 1280w",
      imagesizes: "100vw",
    });
  });

  it("omits a format the encoder skipped", () => {
    const webp = [{ url: "/a-640.webp", width: 640 }];

    expect(buildSources({ avif: [], webp })).toEqual([
      { type: "image/webp", srcset: "/a-640.webp 640w" },
    ]);
    expect(buildPreload(webp, "image/webp", "100vw").type).toBe("image/webp");
  });
});
