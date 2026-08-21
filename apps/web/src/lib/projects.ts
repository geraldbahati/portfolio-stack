import type { PublishedCaseStudy, PublishedProject } from "@portfolio-stack/api/routers/projects";

import { orpc } from "./orpc";

const PROJECTS_FETCH_MS = 4000;

function withTimeout<T>(promise: Promise<T>, message: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), PROJECTS_FETCH_MS);
    }),
  ]);
}

export async function loadPublishedProjects(): Promise<PublishedProject[]> {
  try {
    return await withTimeout(orpc.projects.listPublished(), "projects timeout");
  } catch {
    return [];
  }
}

export async function loadPublishedProject(slug: string): Promise<PublishedCaseStudy | null> {
  try {
    return await withTimeout(orpc.projects.getBySlug({ slug }), "project timeout");
  } catch {
    return null;
  }
}
