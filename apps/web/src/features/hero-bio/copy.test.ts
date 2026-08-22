import { describe, expect, it } from "vitest";

import { BIO_BODY, BIO_TAGLINE, splitWords } from "./copy";
import { charAnimationRangeVh, getBioCharOpacity, remap } from "./timeline";

describe("bio character opacity", () => {
  it("preserves the original staggered reveal curve", () => {
    expect(getBioCharOpacity(0, 0, 100)).toBe(0.2);
    expect(getBioCharOpacity(0.015, 0, 100)).toBeCloseTo(0.6);
    expect(getBioCharOpacity(0.03, 0, 100)).toBe(1);
    expect(getBioCharOpacity(0, 50, 100)).toBe(0.2);
    expect(getBioCharOpacity(1, 99, 100)).toBeCloseTo(0.4667, 3);
  });

  it("fully reveals malformed empty character sets", () => {
    expect(getBioCharOpacity(0, 0, 0)).toBe(1);
  });
});

describe("charAnimationRangeVh", () => {
  it("maps char 0 onto the original 55vh–56.35vh window", () => {
    const range = charAnimationRangeVh(0, 100);
    expect(range.start).toBeCloseTo(55);
    expect(range.end).toBeCloseTo(56.35);
  });

  it("finishes the last characters by 100vh", () => {
    expect(charAnimationRangeVh(99, 100).end).toBeCloseTo(100 + (2 / 100) * 45);
  });
});

describe("remap", () => {
  it("clamps outside the window", () => {
    expect(remap(0.2, 0.4, 1)).toBe(0);
    expect(remap(1, 0.4, 1)).toBe(1);
    expect(remap(0.7, 0.4, 1)).toBeCloseTo(0.5);
  });
});

describe("splitWords", () => {
  it("keeps character offsets aligned with the source words", () => {
    const { words, offsets, charCount } = splitWords(BIO_TAGLINE);
    expect(words).toEqual(["Shipping", "Production", "Impact"]);
    expect(offsets).toEqual([0, 9, 20]);
    expect(charCount).toBe(BIO_TAGLINE.length);
    expect(splitWords(BIO_BODY).words[0]).toBe("Gerald");
  });
});
