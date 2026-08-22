import { describe, expect, it } from "vitest";

import { PAGE_COPY } from "./page-copy";
import { renderSitemap, type SitemapProject } from "./sitemap";

const projects: SitemapProject[] = [
  {
    id: "webline-store",
    title: "Webline Store",
    poster: "https://media.geraldbahati.dev/webline/poster.webp?width=1200&quality=75",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "teamflow",
    title: "TeamFlow",
    poster: null,
    updatedAt: "2026-08-14T12:30:00.000Z",
  },
];

describe("renderSitemap", () => {
  const xml = renderSitemap(projects);

  it("declares the image namespace alongside the sitemap one", () => {
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  });

  it("lists every indexable page and every project", () => {
    for (const loc of [
      "https://www.geraldbahati.dev/",
      "https://www.geraldbahati.dev/projects",
      "https://www.geraldbahati.dev/contact",
      "https://www.geraldbahati.dev/projects/webline-store",
      "https://www.geraldbahati.dev/projects/teamflow",
    ]) {
      expect(xml).toContain(`<loc>${loc}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(5);
  });

  it("keeps the noindexed legal pages out", () => {
    expect(PAGE_COPY.privacy.indexable).toBe(false);
    expect(xml).not.toContain("/privacy");
    expect(xml).not.toContain("/imprint");
  });

  it("dates a project from its own row", () => {
    expect(xml).toContain("<lastmod>2026-08-14T12:30:00.000Z</lastmod>");
  });

  it("dates the list pages from the newest project on them", () => {
    const home = xml.slice(xml.indexOf("<url>"), xml.indexOf("</url>"));
    expect(home).toContain("<loc>https://www.geraldbahati.dev/</loc>");
    expect(home).toContain("<lastmod>2026-08-14T12:30:00.000Z</lastmod>");
  });

  it("omits lastmod rather than inventing one when no project carries a date", () => {
    const undated = renderSitemap([{ id: "teamflow", title: "TeamFlow", poster: null }]);
    expect(undated).not.toContain("<lastmod>");
  });

  it("escapes the ampersands in a transformed poster URL", () => {
    expect(xml).toContain("poster.webp?width=1200&amp;quality=75");
    // A bare `&` makes the whole document unparseable, so Search Console
    // rejects the sitemap outright rather than skipping the one URL.
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|apos;|quot;)/);
    expect(xml).toContain("<image:title>Webline Store</image:title>");
  });

  it("carries the social card as the homepage image", () => {
    expect(xml).toContain("<image:loc>https://www.geraldbahati.dev/og.jpg</image:loc>");
  });
});
