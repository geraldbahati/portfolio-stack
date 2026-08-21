import { describe, expect, it } from "vitest";

import {
  clampProgress,
  faqOffsetPx,
  faqProgress,
  faqTranslateY,
  horizontalProgress,
  isFaqCovering,
  isFaqPhase,
  scrubToward,
  shouldCommitPx,
  trackTranslateX,
} from "./timeline";

describe("gallery progress", () => {
  it("maps the 0.6 split used on the live site", () => {
    expect(horizontalProgress(0)).toBe(0);
    expect(horizontalProgress(0.3)).toBeCloseTo(0.5);
    expect(horizontalProgress(0.6)).toBe(1);
    expect(horizontalProgress(1)).toBe(1);
    expect(faqProgress(0.6)).toBe(0);
    expect(faqProgress(0.8)).toBeCloseTo(0.5);
    expect(faqProgress(1)).toBe(1);
    expect(isFaqPhase(0.6)).toBe(false);
    expect(isFaqPhase(0.61)).toBe(true);
    expect(isFaqCovering(0.61)).toBe(false);
    expect(isFaqCovering(0.779)).toBe(false);
    expect(isFaqCovering(0.78)).toBe(true);
  });

  it("clamps scroll into 0–1", () => {
    expect(clampProgress(-40, 800)).toBe(0);
    expect(clampProgress(400, 800)).toBe(0.5);
    expect(clampProgress(900, 800)).toBe(1);
    expect(clampProgress(10, 0)).toBe(1);
  });

  it("scrubs with the 85ms exponential blend, capped at a 64ms frame", () => {
    const next = scrubToward(0, 1, 85);
    expect(next).toBeCloseTo(1 - Math.exp(-64 / 85));
    expect(scrubToward(0, 1, 0)).toBe(0);
  });

  it("keeps transforms compositor-only", () => {
    expect(trackTranslateX(0.6, 1000)).toBe(-1000);
    expect(faqTranslateY(0.6, 300)).toBe(300);
    expect(faqTranslateY(1, 300)).toBe(0);
    expect(faqOffsetPx(800, 500)).toBe(300);
    expect(faqOffsetPx(800, 780)).toBe(80);
  });

  it("skips sub-pixel transform writes", () => {
    expect(shouldCommitPx(10.2, 10)).toBe(false);
    expect(shouldCommitPx(10.5, 10)).toBe(true);
    expect(shouldCommitPx(0, Number.NaN)).toBe(true);
  });
});
