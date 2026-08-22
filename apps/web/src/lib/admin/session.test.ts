import { describe, expect, it } from "vitest";

import { parseAdminSessionUser } from "./session";

describe("parseAdminSessionUser", () => {
  it("returns a validated admin user", () => {
    expect(
      parseAdminSessionUser({
        user: { id: "admin-1", email: "admin@example.com", name: "Gerald" },
      }),
    ).toEqual({ id: "admin-1", email: "admin@example.com", name: "Gerald" });
  });

  it("uses the email prefix when the name is empty", () => {
    expect(
      parseAdminSessionUser({ user: { id: "admin-1", email: "gerald@example.com", name: "" } }),
    ).toMatchObject({ name: "gerald" });
  });

  it("rejects malformed responses", () => {
    expect(parseAdminSessionUser(null)).toBeNull();
    expect(parseAdminSessionUser({ user: { id: "admin-1" } })).toBeNull();
  });
});
