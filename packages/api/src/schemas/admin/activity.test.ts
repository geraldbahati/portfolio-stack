import { describe, expect, it } from "vitest";

import { adminActivityListSchema, auditActionLabel, auditMetadataSummary } from "./activity";

describe("admin activity contract", () => {
  it("bounds list input and provides stable defaults", () => {
    expect(adminActivityListSchema.parse({})).toEqual({
      search: "",
      category: "all",
      page: 1,
      pageSize: 30,
    });
    expect(adminActivityListSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(adminActivityListSchema.safeParse({ category: "auth" }).success).toBe(false);
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
