import { describe, expect, it } from "vitest";

import { liveJumpLabel, siteHost } from "./live-jump";

describe("siteHost", () => {
  it("shows the bare host a visitor would recognise", () => {
    expect(siteHost("https://webline.co.ke/store")).toBe("webline.co.ke");
    expect(siteHost("https://www.geraldbahati.dev")).toBe("geraldbahati.dev");
    expect(siteHost("http://example.com:8080/a/b?c=d#e")).toBe("example.com");
  });

  it("returns null rather than throwing on anything unparseable", () => {
    expect(siteHost("not a url")).toBeNull();
    expect(siteHost("")).toBeNull();
    expect(siteHost("/projects/webline-store")).toBeNull();
  });
});

describe("liveJumpLabel", () => {
  it("carries the visible host into the accessible name", () => {
    expect(liveJumpLabel("webline.co.ke", "Webline Store")).toBe(
      "Visit webline.co.ke, the live Webline Store site",
    );
  });

  it("falls back to the project name when there is no host to show", () => {
    expect(liveJumpLabel(null, "Webline Store")).toBe("Visit the live Webline Store site");
  });
});
