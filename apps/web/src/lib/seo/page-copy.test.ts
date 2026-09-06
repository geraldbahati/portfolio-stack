import { describe, expect, it } from "vitest";

import { INDEXABLE_PATHS, PAGE_COPY, projectPageCopy } from "./page-copy";

const entries = Object.entries(PAGE_COPY);

describe("page metadata bands", () => {
  it.each(entries)("%s has a title Google can render whole", (_name, page) => {
    // Google truncates around 580 CSS pixels; 60 characters is the usual
    // safe proxy for a title in the default SERP font.
    expect(page.title.length).toBeGreaterThan(10);
    expect(page.title.length).toBeLessThanOrEqual(60);
  });

  it.each(entries)("%s has a description in the snippet band", (_name, page) => {
    // Under ~110 characters Google tends to substitute its own snippet;
    // over ~160 it truncates mid-sentence.
    expect(page.description.length).toBeGreaterThanOrEqual(110);
    expect(page.description.length).toBeLessThanOrEqual(160);
  });

  it("never reuses a title or description across pages", () => {
    const titles = entries.map(([, page]) => page.title);
    const descriptions = entries.map(([, page]) => page.description);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("names the brand in every title", () => {
    for (const [, page] of entries) {
      expect(page.title).toContain("Gerald Bahati");
    }
  });
});

describe("INDEXABLE_PATHS", () => {
  it("carries the pages that should rank and drops the legal boilerplate", () => {
    expect(INDEXABLE_PATHS).toEqual(["/", "/projects", "/contact"]);
  });

  it("stays in sync with the indexable flags", () => {
    const flagged = entries.filter(([, page]) => page.indexable).map(([, page]) => page.path);
    expect(INDEXABLE_PATHS).toEqual(flagged);
  });
});

describe("projectPageCopy", () => {
  it("pads a short tagline up to a usable snippet length", () => {
    const copy = projectPageCopy({
      title: "Webline Store",
      tagline: "A catalogue that loads before you finish clicking",
    });

    expect(copy.heading).toBe("Webline Store: What I Shipped");
    expect(copy.title).toBe("Webline Store Case Study | Gerald Bahati");
    expect(copy.description.length).toBeGreaterThanOrEqual(100);
    expect(copy.description.length).toBeLessThanOrEqual(160);
  });

  it("uses a substantive project summary instead of a shorter marketing tagline", () => {
    const summary =
      "A Nairobi technology platform built with a fast storefront, resilient payments, edge caching, and an independently deployed catalogue.";
    const copy = projectPageCopy({
      title: "Webline Store",
      tagline: "Shopping without the wait",
      description: summary,
    });

    expect(copy.description).toBe(summary);
  });

  it("keeps long project summaries inside the search snippet band", () => {
    const copy = projectPageCopy({
      title: "Webline Store",
      description:
        "A production e-commerce platform with a large catalogue, resilient payments, edge caching, accessible product discovery, inventory workflows, analytics, operational tooling, and a deliberately long summary that should not be cut off in the middle of a search result.",
    });

    expect(copy.description.length).toBeLessThanOrEqual(160);
    expect(copy.description.endsWith("…")).toBe(true);
  });

  it("drops the brand suffix once the project name alone fills the title", () => {
    const copy = projectPageCopy({
      title: "Real-Time Collaboration Platform for Distributed Teams",
      description: "A long-running case study.",
    });

    expect(copy.title).not.toContain("| Gerald Bahati");
    expect(copy.title).toBe("Real-Time Collaboration Platform for Distributed Teams Case Study");
  });

  it("folds the case study's own vocabulary into the keywords", () => {
    const copy = projectPageCopy({
      title: "Webline Store",
      description: "Edge storefront",
      services: ["M-Pesa integration", "Cloudflare Workers"],
      industry: "E-commerce",
      client: "Webline Technologies",
    });

    expect(copy.keywords).toContain("Webline Store case study");
    expect(copy.keywords).toContain("M-Pesa integration");
    expect(copy.keywords).toContain("E-commerce");
    expect(copy.keywords).toContain("Webline Technologies");
  });
});
