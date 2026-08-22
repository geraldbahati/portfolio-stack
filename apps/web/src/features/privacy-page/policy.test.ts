import { describe, expect, it } from "vitest";

import { parsePrivacyPolicy } from "./policy";

describe("parsePrivacyPolicy", () => {
  it("creates stable numbered section IDs and renders markdown", () => {
    const sections = parsePrivacyPolicy(
      `# Privacy\n\n## 1. Data & privacy\n\nRead the **policy**.`,
    );

    expect(sections).toEqual([
      {
        id: "section-1-data-and-privacy",
        title: "1. Data & privacy",
        html: "<p>Read the <strong>policy</strong>.</p>\n",
      },
    ]);
  });
});
