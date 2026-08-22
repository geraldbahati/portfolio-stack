import type { APIRoute } from "astro";

import { loadPublishedProjects } from "../lib/data/projects";
import { renderSitemap } from "../lib/seo/sitemap";

export const prerender = false;

export const GET: APIRoute = async () => {
  const projects = await loadPublishedProjects();

  return new Response(renderSitemap(projects), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
