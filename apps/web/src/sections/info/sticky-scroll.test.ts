import { describe, expect, it } from "vitest";

import {
  clipPathFor,
  clipProgress,
  GRAY_400,
  interpolateColor,
  interpolateOpacity,
  PAINT_EPSILON,
  sectionProgress,
  TEXT_PRIMARY,
} from "./sticky-scroll";

describe("sectionProgress", () => {
  it("is 0 before the section reaches viewport center", () => {
    expect(sectionProgress({ top: 800, height: 800 }, 800)).toBe(0);
  });

  it("is 0.5 when the section is centered", () => {
    expect(sectionProgress({ top: 0, height: 800 }, 800)).toBe(0.5);
  });

  it("is 1 after the section has passed center", () => {
    expect(sectionProgress({ top: -800, height: 800 }, 800)).toBe(1);
  });
});

describe("clipProgress", () => {
  it("starts clipping as the next section's center enters the viewport", () => {
    expect(clipProgress({ top: 800, height: 800 }, 800)).toBe(0);
    expect(clipProgress({ top: 0, height: 800 }, 800)).toBe(1);
  });
});

describe("color / opacity plateaus", () => {
  it("fades dim→active in the first 10%, holds, then fades out", () => {
    expect(interpolateOpacity(0)).toBeCloseTo(0.3);
    expect(interpolateOpacity(0.05)).toBeCloseTo(0.65);
    expect(interpolateOpacity(0.5)).toBe(1);
    expect(interpolateOpacity(1)).toBeCloseTo(0.3);
  });

  it("interpolates oklch through the same stops", () => {
    expect(interpolateColor(0, GRAY_400, TEXT_PRIMARY)).toBe("oklch(0.702 0 0)");
    expect(interpolateColor(0.5, GRAY_400, TEXT_PRIMARY)).toBe("oklch(0 0 0)");
    const faded = interpolateColor(1, GRAY_400, TEXT_PRIMARY);
    const lightness = Number(faded.slice("oklch(".length).split(" ")[0]);
    expect(lightness).toBeCloseTo(GRAY_400.l);
  });

  it("builds a top-edge clip-path", () => {
    expect(clipPathFor(0)).toBe("inset(100.00% 0 0 0)");
    expect(clipPathFor(1)).toBe("inset(0.00% 0 0 0)");
  });

  it("skips sub-pixel scroll paints", () => {
    expect(PAINT_EPSILON).toBe(0.002);
  });
});
