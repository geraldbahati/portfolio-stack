import { describe, expect, it } from "vitest";

import { adminActivityListSchema, auditActionLabel, auditMetadataSummary } from "./activity";

describe("admin activity contract", () => {
  it("bounds list input and provides stable defaults", () => {
    expect(adminActivityListSchema.parse({})).toEqual({
      search: "",
      category: "all",
      direction: "older",
      pageSize: 30,
      includeTotal: false,
    });
    expect(adminActivityListSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(adminActivityListSchema.safeParse({ category: "billing" }).success).toBe(false);
    expect(adminActivityListSchema.safeParse({ category: "auth" }).success).toBe(true);
  });

  it("accepts calendar dates in order only", () => {
    expect(
      adminActivityListSchema.safeParse({ from: "2026-10-01", to: "2026-10-04" }).success,
    ).toBe(true);
    expect(
      adminActivityListSchema.safeParse({ from: "2026-10-04", to: "2026-10-01" }).success,
    ).toBe(false);
    expect(adminActivityListSchema.safeParse({ from: "yesterday" }).success).toBe(false);
  });

  it("formats known actions and exposes only recognized metadata", () => {
    expect(auditActionLabel("project.metrics.replace")).toBe("Project · Metrics · Replace");
    expect(
      auditMetadataSummary({
        changedFields: ["location", 123],
        size: 2048,
        secret: "must not render",
      }),
    ).toEqual(["Fields: location", "2048 bytes"]);
  });
});
