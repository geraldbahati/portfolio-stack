import type { APIRoute } from "astro";

import { loadPublishedProjects } from "../lib/data/projects";
import { PublicDataUnavailableError, serviceUnavailable } from "../lib/data/public-request";
import { renderLlmsTxt } from "../lib/seo/llms-txt";

// Rendered per request so the work list tracks whatever is published, the
// same way the sitemap does.
export const prerender = false;

export const GET: APIRoute = async () => {
  let projects: Awaited<ReturnType<typeof loadPublishedProjects>>;
  try {
    projects = await loadPublishedProjects();
  } catch (error) {
    if (!(error instanceof PublicDataUnavailableError)) throw error;
    return serviceUnavailable(new Response("Service temporarily unavailable"));
  }

  return new Response(
    renderLlmsTxt(
      projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description ?? project.alt,
      })),
    ),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
};
