import { describe, expect, it } from "vitest";

import { adminMessageActionSchema, adminMessageListSchema, canDeleteMessage } from "./message";

describe("admin message validation", () => {
  it("applies privacy-safe inbox defaults", () => {
    expect(adminMessageListSchema.parse({})).toEqual({
      search: "",
      status: "all",
      view: "inbox",
      read: "all",
      page: 1,
      pageSize: 20,
    });
  });

  it("accepts only known state-changing actions", () => {
    const id = "d9428888-122b-11e1-b85c-61cd3cbb3210";
    expect(adminMessageActionSchema.safeParse({ id, action: "archive" }).success).toBe(true);
    expect(adminMessageActionSchema.safeParse({ id, action: "forward" }).success).toBe(false);
  });

  it("requires the exact message ID before permanent deletion", () => {
    expect(canDeleteMessage("contact-123", "contact-123")).toBe(true);
    expect(canDeleteMessage("contact-123", "CONTACT-123")).toBe(false);
    expect(canDeleteMessage("contact-123", "")).toBe(false);
  });
});
