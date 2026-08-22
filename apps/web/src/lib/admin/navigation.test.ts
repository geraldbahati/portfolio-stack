import { describe, expect, it } from "vitest";

import { isAdminNavigationActive } from "./navigation";

describe("isAdminNavigationActive", () => {
  it("matches the overview exactly", () => {
    expect(isAdminNavigationActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavigationActive("/admin/projects", "/admin")).toBe(false);
  });

  it("matches a module and its nested routes", () => {
    expect(isAdminNavigationActive("/admin/projects", "/admin/projects")).toBe(true);
    expect(isAdminNavigationActive("/admin/projects/new", "/admin/projects")).toBe(true);
    expect(isAdminNavigationActive("/admin/messages", "/admin/projects")).toBe(false);
  });
});
