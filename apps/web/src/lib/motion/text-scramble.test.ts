import { describe, expect, it } from "vitest";

import { scrambleText } from "./text-scramble";

describe("scrambleText", () => {
  it("returns the original string once progress is complete", () => {
    expect(scrambleText("make contact", 1)).toBe("make contact");
  });

  it("preserves spaces while scrambling", () => {
    const scrambled = scrambleText("ab cd", 0);
    expect(scrambled[2]).toBe(" ");
    expect(scrambled).toHaveLength(5);
  });
});
