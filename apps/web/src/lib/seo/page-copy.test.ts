import { describe, expect, it } from "vitest";

import { INDEXABLE_PATHS, PAGE_COPY, projectPageCopy } from "./page-copy";
import { PROJECT_SEARCH_COPY } from "./project-search-copy";

const entries = Object.entries(PAGE_COPY);

describe("page metadata bands", () => {
  it.each(entries)("%s follows the site's concise title guideline", (_name, page) => {
    // An editorial target, not a guarantee about Google's displayed title.
    expect(page.title.length).toBeGreaterThan(10);
    expect(page.title.length).toBeLessThanOrEqual(60);
  });

  it.each(entries)("%s has a description in the snippet band", (_name, page) => {
    // Editorial targets only; Google can choose a query-specific snippet.
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
  it("keeps a relevant short tagline without generic padding", () => {
    const copy = projectPageCopy({
      title: "Webline Store",
      tagline: "A catalogue that loads before you finish clicking",
    });

    expect(copy.heading).toBe("Webline Store: What I Shipped");
    expect(copy.title).toBe("Webline Store Case Study | Gerald Bahati");
    expect(copy.description).toBe("A catalogue that loads before you finish clicking");
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

  it("prefers the factual summary even when a promotional tagline is longer", () => {
    expect(
      projectPageCopy({
        title: "Booking",
        description: "Guest appointments with M-Pesa payments.",
        tagline:
          "A very long promotional tagline that has less information about the actual project.",
      }).description,
    ).toBe("Guest appointments with M-Pesa payments.");
  });

  it("uses unique editorial copy for each existing case study", () => {
    const descriptions = Object.values(PROJECT_SEARCH_COPY).map((copy) => copy.description);
    expect(new Set(descriptions).size).toBe(6);
    for (const [slug, editorial] of Object.entries(PROJECT_SEARCH_COPY)) {
      const result = projectPageCopy({ slug, title: "Project", description: "Fallback" });
      expect(result.title).toContain(editorial.topic);
      expect(result.description).toBe(editorial.description);
      expect(result.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("falls back to CMS metadata for new projects and unexpected slugs", () => {
    for (const slug of ["new-project", "constructor", "__proto__"]) {
      const result = projectPageCopy({
        slug,
        title: "Example",
        industry: "Healthcare",
        description: "A booking platform.",
      });
      expect(result.title).toContain("Healthcare Case Study");
      expect(result.description).toBe("A booking platform.");
    }
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
