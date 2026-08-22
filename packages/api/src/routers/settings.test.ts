import { describe, expect, it } from "vitest";

import { DEFAULT_PUBLIC_SITE_SETTINGS, resolvePublicSiteSettings } from "../site-settings";

describe("public settings", () => {
  it("uses safe defaults when no valid record exists", () => {
    expect(resolvePublicSiteSettings(null)).toEqual(DEFAULT_PUBLIC_SITE_SETTINGS);
    expect(resolvePublicSiteSettings({ githubUrl: "javascript:alert(1)" })).toEqual(
      DEFAULT_PUBLIC_SITE_SETTINGS,
    );
  });

  it("removes database-only fields from a valid record", () => {
    const resolved = resolvePublicSiteSettings({
      id: "primary",
      ...DEFAULT_PUBLIC_SITE_SETTINGS,
      updatedAt: new Date(),
    });
    expect(resolved).toEqual(DEFAULT_PUBLIC_SITE_SETTINGS);
    expect("id" in resolved).toBe(false);
  });
});
