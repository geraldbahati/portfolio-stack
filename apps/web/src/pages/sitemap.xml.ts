import type { APIRoute } from "astro";

import { loadPublishedProjects } from "../lib/data/projects";
import { PublicDataUnavailableError, serviceUnavailable } from "../lib/data/public-request";
import { renderSitemap } from "../lib/seo/sitemap";

export const prerender = false;

export const GET: APIRoute = async () => {
  let projects: Awaited<ReturnType<typeof loadPublishedProjects>>;
  try {
    projects = await loadPublishedProjects();
  } catch (error) {
    if (!(error instanceof PublicDataUnavailableError)) throw error;
    return serviceUnavailable(new Response("Service temporarily unavailable"));
  }

  return new Response(renderSitemap(projects), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
