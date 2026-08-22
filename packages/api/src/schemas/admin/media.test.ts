import { describe, expect, it } from "vitest";

import { adminMediaDeleteSchema, adminMediaListSchema, canDeleteMedia } from "./media";

describe("admin media validation", () => {
  it("uses bounded list defaults", () => {
    expect(adminMediaListSchema.parse({})).toEqual({ prefix: "all", cursor: "", limit: 48 });
  });

  it("rejects unsafe keys and non-exact deletion confirmation", () => {
    expect(
      adminMediaDeleteSchema.safeParse({ key: "projects/../secret", confirmation: "" }).success,
    ).toBe(false);
    expect(canDeleteMedia("projects/hero.webp", "projects/hero.webp")).toBe(true);
    expect(canDeleteMedia("projects/hero.webp", "hero.webp")).toBe(false);
  });
});
