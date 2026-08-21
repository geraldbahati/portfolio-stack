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
        email: "journeytoharvard@gmail.com",
        password: "short",
      }),
    ).rejects.toMatchObject({ code: "weak_password" });
  });
});
