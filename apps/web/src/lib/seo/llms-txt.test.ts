import { describe, expect, it } from "vitest";

import { renderLlmsTxt } from "./llms-txt";

describe("renderLlmsTxt", () => {
  const body = renderLlmsTxt([
    { id: "webline-store", title: "Webline Store", description: "M-Pesa\n  checkout." },
    { id: "teamflow", title: "TeamFlow", description: null },
  ]);

  it("leads with the site name and the positioning", () => {
    expect(body.startsWith("# Gerald Bahati\n")).toBe(true);
    expect(body).toContain("> I'm Gerald Bahati");
  });

  it("links every project at its canonical URL", () => {
    expect(body).toContain(
      "- [Webline Store](https://www.geraldbahati.dev/projects/webline-store): M-Pesa checkout.",
    );
    expect(body).toContain("- [TeamFlow](https://www.geraldbahati.dev/projects/teamflow)");
  });

  it("falls back to the index when nothing is published", () => {
    expect(renderLlmsTxt([])).toContain(
      "- [Projects](https://www.geraldbahati.dev/projects): Production case studies.",
    );
  });

  it("lists the social profiles a crawler would otherwise have to infer", () => {
    expect(body).toContain("https://github.com/geraldbahati");
    expect(body).toContain("https://www.linkedin.com/in/geraldbahati/");
  });
});
