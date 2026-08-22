import { describe, expect, it } from "vitest";

import { seedAdminUser } from "./seed-admin";

describe("seedAdminUser", () => {
  it("rejects addresses that are not allowlisted", async () => {
    await expect(
      seedAdminUser({} as never, {
        email: "stranger@example.com",
        password: "a-very-long-password",
      }),
    ).rejects.toMatchObject({ code: "not_allowlisted" });
  });

  it("rejects short passwords", async () => {
    await expect(
      seedAdminUser({} as never, {
        email: "hello@geraldbahati.dev",
        password: "short",
      }),
    ).rejects.toMatchObject({ code: "weak_password" });
  });

  it("rejects the automation identity outside the test environment", async () => {
    await expect(
      seedAdminUser({} as never, {
        email: "e2e-admin@geraldbahati.dev",
        password: "a-very-long-password",
      }),
    ).rejects.toMatchObject({ code: "not_allowlisted" });
  });
});
