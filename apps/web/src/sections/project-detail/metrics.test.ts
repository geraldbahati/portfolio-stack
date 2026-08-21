import { describe, expect, it } from "vitest";

import { metricRingPercent } from "./metrics";

describe("metricRingPercent", () => {
  it("uses the first numeric value and caps the chart at 100", () => {
    expect(metricRingPercent("100%")).toBe(100);
    expect(metricRingPercent("87 %")).toBe(87);
    expect(metricRingPercent("5")).toBe(5);
    expect(metricRingPercent("0")).toBe(0);
    expect(metricRingPercent("30×")).toBe(30);
    expect(metricRingPercent("715ms to 24ms")).toBe(100);
  });

  it("uses the original chart fallback for text-only values", () => {
    expect(metricRingPercent("Instant")).toBe(50);
    expect(metricRingPercent("M-Pesa")).toBe(50);
    expect(metricRingPercent("No account")).toBe(50);
  });
});
