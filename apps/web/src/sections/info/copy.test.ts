import { describe, expect, it } from "vitest";

import { CLOSING_LEAD, SERVICE_SECTIONS, SERVICES_DIVIDER } from "./copy";

describe("services copy", () => {
  it("keeps the live-site section order and divider", () => {
    expect(SERVICES_DIVIDER).toEqual({ label: "SERVICES IN DETAIL", counter: "(02)" });
    expect(SERVICE_SECTIONS.map((section) => section.label)).toEqual([
      "FRONTEND",
      "BACKEND",
      "INFRASTRUCTURE",
      "AI & REALTIME",
    ]);
    expect(CLOSING_LEAD).toBe("Product Engineering");
  });
});
