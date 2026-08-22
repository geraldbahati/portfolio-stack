import { describe, expect, it } from "vitest";

import { PRIVATE_PATH_PREFIXES } from "../http/cache";
import { AI_AGENTS, renderRobotsTxt } from "./robots";

const body = renderRobotsTxt();

describe("renderRobotsTxt", () => {
  it("opens the public site to the wildcard group", () => {
    expect(body).toMatch(/User-agent: \*\nAllow: \//);
  });

  it("disallows every private prefix in every group", () => {
    const groups = body.split(/^User-agent: /m).slice(1);
    expect(groups).toHaveLength(AI_AGENTS.length + 1);

    for (const group of groups) {
      for (const prefix of PRIVATE_PATH_PREFIXES) {
        expect(group).toContain(`Disallow: ${prefix}`);
      }
    }
  });

  it("names the retrieval and training crawlers explicitly", () => {
    for (const agent of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "GPTBot"]) {
      expect(body).toContain(`User-agent: ${agent}`);
    }
  });

  it("points at the sitemap on the canonical host", () => {
    expect(body).toContain("Sitemap: https://www.geraldbahati.dev/sitemap.xml");
    expect(body).toContain("Host: www.geraldbahati.dev");
  });
});
