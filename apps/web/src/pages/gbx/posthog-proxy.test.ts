import { describe, expect, it } from "vitest";

import { posthogTarget } from "./[...path]";

describe("posthogTarget", () => {
  it("keeps the static segment so the asset host resolves the chunk", () => {
    expect(posthogTarget("static/1.418.6/web-vitals.js", "")).toBe(
      "https://eu-assets.i.posthog.com/static/1.418.6/web-vitals.js",
    );
  });

  it("routes every lazily loaded chunk to the asset host", () => {
    for (const chunk of ["surveys.js", "dead-clicks-autocapture.js", "web-vitals.js"]) {
      expect(posthogTarget(`static/${chunk}`, "?v=1.418.6")).toBe(
        `https://eu-assets.i.posthog.com/static/${chunk}?v=1.418.6`,
      );
    }
  });

  it("sends ingest traffic to the API host", () => {
    expect(posthogTarget("e/", "?ip=0")).toBe("https://eu.i.posthog.com/e/?ip=0");
    expect(posthogTarget("decide/", "")).toBe("https://eu.i.posthog.com/decide/");
  });

  it("treats a bare static path as an asset request", () => {
    expect(posthogTarget("static", "")).toBe("https://eu-assets.i.posthog.com/static");
  });

  it("does not mistake a path merely beginning with those letters for an asset", () => {
    expect(posthogTarget("statics/thing.js", "")).toBe("https://eu.i.posthog.com/statics/thing.js");
  });

  it("preserves the query string it is handed", () => {
    expect(posthogTarget("e/", "?v=2&ip=1")).toBe("https://eu.i.posthog.com/e/?v=2&ip=1");
  });
});
