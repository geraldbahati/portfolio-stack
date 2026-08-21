import type { APIRoute } from "astro";

import { loadPublishedProjects } from "../lib/projects";
import { canonicalUrl } from "../lib/site";

export const prerender = false;

const STATIC_PATHS = ["/", "/projects", "/contact", "/privacy", "/imprint"] as const;

function urlTag(loc: string) {
  return `  <url><loc>${loc}</loc></url>`;
}

export const GET: APIRoute = async () => {
  const projects = await loadPublishedProjects();
  const urls = [
    ...STATIC_PATHS.map((path) => canonicalUrl(path)),
    ...projects.map((project) => canonicalUrl(`/projects/${project.id}`)),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlTag).join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
