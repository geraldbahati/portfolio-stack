import { describe, expect, it } from "vitest";

import { IMAGE_PRESETS } from "../images/image-presets";
import { posterDimensions, projectMediaAssets, projectPosterPreload } from "./poster";

const STREAM = "customer-pdxnd9di8ybc2kur.cloudflarestream.com";
const env = { streamCustomer: STREAM, transformZone: "geraldbahati.dev" };

describe("projectMediaAssets", () => {
  it("builds Stream HLS + thumbnail srcset from a uid", () => {
    const assets = projectMediaAssets(
      {
        src: `https://${STREAM}/5874f6a9938431958ee99e5c9354c9b5/manifest/video.m3u8`,
        poster: `https://${STREAM}/5874f6a9938431958ee99e5c9354c9b5/thumbnails/thumbnail.jpg`,
        type: "video",
      },
      env,
    );

    expect(assets.kind).toBe("stream");
    expect(assets.hlsSrc).toContain("/5874f6a9938431958ee99e5c9354c9b5/manifest/video.m3u8");
    expect(assets.srcset).toContain("width=400");
    expect(assets.srcset).toContain(" 400w, ");
    expect(assets.srcset).toContain("1080w");
    expect(assets.sizes).toBe(IMAGE_PRESETS.projectCard.sizes);
  });

  it("uses index sizes when provided", () => {
    const assets = projectMediaAssets(
      {
        src: `https://${STREAM}/5874f6a9938431958ee99e5c9354c9b5/manifest/video.m3u8`,
        poster: `https://${STREAM}/5874f6a9938431958ee99e5c9354c9b5/thumbnails/thumbnail.jpg`,
        type: "video",
      },
      env,
      { sizes: IMAGE_PRESETS.projectIndex.sizes },
    );

    expect(assets.sizes).toBe(IMAGE_PRESETS.projectIndex.sizes);
    expect(assets.sizes).toContain("640px");
  });

  it("routes R2 posters through /cdn-cgi/image", () => {
    const assets = projectMediaAssets(
      {
        src: "https://media.geraldbahati.dev/projects/demo.mp4",
        poster: "https://media.geraldbahati.dev/projects/demo.webp",
        type: "video",
      },
      env,
    );

    expect(assets.kind).toBe("r2");
    expect(assets.posterSrc).toContain("/cdn-cgi/image/");
    expect(assets.sources.map((source) => source.type)).toEqual(["image/avif", "image/webp"]);
  });

  it("preloads AVIF for R2 posters and jpeg for Stream posters", () => {
    const stream = projectMediaAssets(
      {
        src: `https://${STREAM}/5874f6a9938431958ee99e5c9354c9b5/manifest/video.m3u8`,
        poster: `https://${STREAM}/5874f6a9938431958ee99e5c9354c9b5/thumbnails/thumbnail.jpg`,
        type: "video",
      },
      env,
      { sizes: IMAGE_PRESETS.projectIndex.sizes },
    );
    const streamPreload = projectPosterPreload(stream);
    expect(streamPreload?.type).toBe("image/jpeg");
    expect(streamPreload?.imagesizes).toBe(IMAGE_PRESETS.projectIndex.sizes);

    const r2 = projectMediaAssets(
      {
        src: "https://media.geraldbahati.dev/projects/demo.mp4",
        poster: "https://media.geraldbahati.dev/projects/demo.webp",
        type: "video",
      },
      env,
    );
    const r2Preload = projectPosterPreload(r2);
    expect(r2Preload?.type).toBe("image/avif");
    expect(r2Preload?.href).toContain("/cdn-cgi/image/");
  });
});

describe("posterDimensions", () => {
  it("maps 16/9 to an 800-wide box", () => {
    expect(posterDimensions("16/9")).toEqual({ width: 800, height: 450 });
    expect(posterDimensions("4 / 3")).toEqual({ width: 800, height: 600 });
  });
});
