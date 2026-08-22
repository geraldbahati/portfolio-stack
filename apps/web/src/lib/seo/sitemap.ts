import { INDEXABLE_PATHS } from "./page-copy";
import { canonicalUrl, OG_IMAGE_URL } from "./site";

/**
 * Google ignores `<priority>` and `<changefreq>` outright; Bing and Yandex
 * still read them. They cost two lines each, so they stay — but `<lastmod>`
 * is the one that matters, and it is only ever written from a real row
 * timestamp so the freshness signal stays trustworthy.
 */
const PAGE_PRIORITY: Record<string, string> = {
  "/": "1.0",
  "/projects": "0.9",
  "/contact": "0.8",
};

function changeFreq(path: string): string {
  return path === "/" || path === "/projects" ? "weekly" : "monthly";
}

export type SitemapProject = {
  id: string;
  title: string;
  poster: string | null;
  updatedAt?: string;
};

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
  image?: { loc: string; title?: string };
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) =>
    char === "<"
      ? "&lt;"
      : char === ">"
        ? "&gt;"
        : char === "&"
          ? "&amp;"
          : char === "'"
            ? "&apos;"
            : "&quot;",
  );
}

function urlTag(entry: SitemapEntry) {
  const lines = [
    `    <loc>${escapeXml(entry.loc)}</loc>`,
    ...(entry.lastmod ? [`    <lastmod>${entry.lastmod}</lastmod>`] : []),
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    ...(entry.image
      ? [
          "    <image:image>",
          `      <image:loc>${escapeXml(entry.image.loc)}</image:loc>`,
          ...(entry.image.title
            ? [`      <image:title>${escapeXml(entry.image.title)}</image:title>`]
            : []),
          "    </image:image>",
        ]
      : []),
  ];

  return `  <url>\n${lines.join("\n")}\n  </url>`;
}

export function sitemapEntries(projects: readonly SitemapProject[]): SitemapEntry[] {
  // A page's freshness is the newest thing on it. The homepage and the index
  // both embed the project list, so an edit to any case study moves them too.
  const newestProject = projects
    .map((project) => project.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const staticEntries = INDEXABLE_PATHS.map<SitemapEntry>((path) => ({
    loc: canonicalUrl(path),
    lastmod: path === "/" || path === "/projects" ? newestProject : undefined,
    changefreq: changeFreq(path),
    priority: PAGE_PRIORITY[path] ?? "0.5",
    ...(path === "/" ? { image: { loc: OG_IMAGE_URL } } : {}),
  }));

  const projectEntries = projects.map<SitemapEntry>((project) => ({
    loc: canonicalUrl(`/projects/${project.id}`),
    lastmod: project.updatedAt,
    changefreq: "monthly",
    priority: "0.7",
    ...(project.poster ? { image: { loc: project.poster, title: project.title } } : {}),
  }));

  return [...staticEntries, ...projectEntries];
}

export function renderSitemap(projects: readonly SitemapProject[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapEntries(projects).map(urlTag).join("\n")}
</urlset>
`;
}
