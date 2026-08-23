import { describe, expect, it } from "vitest";

import {
  adminProjectPageHref,
  hasActiveAdminProjectFilters,
  parseAdminProjectListQuery,
} from "./project-list";

describe("admin project list query", () => {
  it("normalizes the default query", () => {
    expect(parseAdminProjectListQuery(new URLSearchParams())).toEqual({
      search: "",
      status: "all",
      page: 1,
    });
  });

  it("trims search text and accepts supported filters", () => {
    expect(
      parseAdminProjectListQuery(
        new URLSearchParams({ q: "  portfolio  ", status: "published", page: "3" }),
      ),
    ).toEqual({ search: "portfolio", status: "published", page: 3 });
  });

  it.each(["", "0", "-1", "1.5", "2abc", "999999999999999999999999"])(
    "falls back to page one for an invalid page value of %j",
    (page) => {
      expect(parseAdminProjectListQuery(new URLSearchParams({ page })).page).toBe(1);
    },
  );

  it("falls back to all projects for an unsupported status", () => {
    expect(parseAdminProjectListQuery(new URLSearchParams({ status: "archived" })).status).toBe(
      "all",
    );
  });

  it("detects active search and status filters", () => {
    expect(hasActiveAdminProjectFilters({ search: "", status: "all", page: 1 })).toBe(false);
    expect(hasActiveAdminProjectFilters({ search: "astro", status: "all", page: 1 })).toBe(true);
    expect(hasActiveAdminProjectFilters({ search: "", status: "draft", page: 1 })).toBe(true);
  });

  it("builds pagination links while preserving active filters", () => {
    const query = { search: "case study", status: "draft" } as const;

    expect(adminProjectPageHref(query, 1)).toBe("/admin/projects?q=case+study&status=draft");
    expect(adminProjectPageHref(query, 4)).toBe("/admin/projects?q=case+study&status=draft&page=4");
  });
});
