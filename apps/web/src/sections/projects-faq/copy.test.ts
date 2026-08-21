import { describe, expect, it } from "vitest";

import { FAQ_ENTRIES, FAQ_ITEMS, PROJECTS_DIVIDER } from "./copy";

describe("projects / FAQ copy", () => {
  it("keeps the live dividers and FAQ order", () => {
    expect(PROJECTS_DIVIDER).toEqual({ label: "FEATURED PROJECTS", counter: "(03)" });
    expect(FAQ_ITEMS.map((item) => item.question)).toEqual([
      "HOW DOES WORKING WITH YOU LOOK LIKE?",
      "WHY SHOULD COMPANIES HIRE YOU?",
      "WHAT IS YOUR TECH STACK?",
      "WHAT TYPES OF PROJECTS HAVE YOU DELIVERED?",
      "ARE YOU OPEN TO REMOTE OR HYBRID ROLES?",
    ]);
    expect(FAQ_ENTRIES).toHaveLength(5);
    expect(FAQ_ITEMS[0]?.steps).toHaveLength(4);
  });
});
