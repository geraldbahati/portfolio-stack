import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  siteSettingsWriteSchema,
  socialLinksFromSettings,
} from "./site-settings";

describe("site settings contract", () => {
  it("accepts the checked-in defaults and derives ordered social links", () => {
    const settings = siteSettingsWriteSchema.parse(DEFAULT_PUBLIC_SITE_SETTINGS);
    expect(socialLinksFromSettings(settings).map((link) => link.id)).toEqual([
      "instagram",
      "linkedin",
      "x",
      "whatsapp",
      "github",
    ]);
  });

  it("accepts empty optional links and rejects unsafe or incorrect hosts", () => {
    const input = { ...DEFAULT_PUBLIC_SITE_SETTINGS, instagramUrl: "" };
    expect(siteSettingsWriteSchema.parse(input).instagramUrl).toBe("");
    expect(
      siteSettingsWriteSchema.safeParse({ ...input, githubUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      siteSettingsWriteSchema.safeParse({
        ...input,
        githubUrl: "https://example.com/geraldbahati",
      }).success,
    ).toBe(false);
  });
});
