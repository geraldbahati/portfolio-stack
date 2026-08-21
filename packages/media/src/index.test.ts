import { describe, expect, it } from "vitest";

import {
  buildCfImageSrcset,
  buildStreamPosterSrcset,
  detectMediaSource,
  extractStreamUid,
  getCfPictureSources,
  getTransformedImageUrl,
  sanitizeMediaPreviewUrl,
} from "./index";

describe("sanitizeMediaPreviewUrl", () => {
  it("allows trusted media hosts", () => {
    expect(sanitizeMediaPreviewUrl("https://media.geraldbahati.dev/projects/image/test.webp")).toBe(
      "https://media.geraldbahati.dev/projects/image/test.webp",
    );
    expect(
      sanitizeMediaPreviewUrl(
        "https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abc/manifest/video.m3u8",
      ),
    ).toBe("https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abc/manifest/video.m3u8");
  });

  it("allows blob previews created during upload", () => {
    expect(sanitizeMediaPreviewUrl("blob:https://example.com/abc")).toBe(
      "blob:https://example.com/abc",
    );
  });

  it("rejects javascript and untrusted hosts", () => {
    expect(sanitizeMediaPreviewUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeMediaPreviewUrl("https://evil.com/image.png")).toBeNull();
    expect(sanitizeMediaPreviewUrl("https://evil.com/?cloudflarestream.com/fake.m3u8")).toBeNull();
  });
});

describe("detectMediaSource", () => {
  it("classifies stream, r2, and query-string bait", () => {
    expect(
      detectMediaSource(
        "https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abc/manifest/video.m3u8",
      ),
    ).toBe("stream");
    expect(detectMediaSource("https://media.geraldbahati.dev/x.webp")).toBe("r2");
    expect(detectMediaSource("https://evil.com/?media.geraldbahati.dev")).toBe("external");
  });
});

describe("extractStreamUid / transforms", () => {
  it("pulls the uid out of a Stream HLS URL", () => {
    expect(
      extractStreamUid(
        "https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abcdef0123456789/manifest/video.m3u8",
      ),
    ).toBe("abcdef0123456789");
  });

  it("builds a /cdn-cgi/image URL", () => {
    expect(getTransformedImageUrl("https://media.geraldbahati.dev/x.webp", { width: 800 })).toBe(
      "https://media.geraldbahati.dev/cdn-cgi/image/width=800,fit=cover,quality=85,format=auto/https://media.geraldbahati.dev/x.webp",
    );
  });

  it("builds a Stream poster srcset", () => {
    expect(buildStreamPosterSrcset("abc123", [400, 800])).toBe(
      "https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abc123/thumbnails/thumbnail.jpg?time=1s&width=400&fit=crop 400w, https://customer-pdxnd9di8ybc2kur.cloudflarestream.com/abc123/thumbnails/thumbnail.jpg?time=1s&width=800&fit=crop 800w",
    );
  });

  it("builds responsive CF srcsets and AVIF/WebP picture sources", () => {
    const srcset = buildCfImageSrcset("https://media.geraldbahati.dev/x.webp", [400, 800], {
      quality: 70,
    });
    expect(srcset).toContain("width=400");
    expect(srcset).toContain("width=800");
    expect(srcset).toContain(" 400w, ");
    expect(
      getCfPictureSources("https://media.geraldbahati.dev/x.webp", [800], { quality: 70 }),
    ).toEqual([
      {
        type: "image/avif",
        srcset:
          "https://media.geraldbahati.dev/cdn-cgi/image/width=800,fit=cover,quality=70,format=avif/https://media.geraldbahati.dev/x.webp 800w",
      },
      {
        type: "image/webp",
        srcset:
          "https://media.geraldbahati.dev/cdn-cgi/image/width=800,fit=cover,quality=70,format=webp/https://media.geraldbahati.dev/x.webp 800w",
      },
    ]);
  });
});
