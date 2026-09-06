import type { PublishedCaseStudy, PublishedProject } from "@portfolio-stack/api/routers/projects";

import { orpc } from "./orpc";
import { withPublicCache } from "./public-cache";
import { fetchPublicData } from "./public-request";

const PROJECTS_FETCH_MS = 4000;

export function loadPublishedProjects(): Promise<PublishedProject[]> {
  return withPublicCache("projects:published", () =>
    fetchPublicData("projects:published", PROJECTS_FETCH_MS, (signal) =>
      orpc.projects.listPublished(undefined, { signal }),
    ),
  );
}

export function loadPublishedProject(slug: string): Promise<PublishedCaseStudy | null> {
  return withPublicCache(`projects:slug:${slug}`, () =>
    fetchPublicData("projects:detail", PROJECTS_FETCH_MS, (signal) =>
      orpc.projects.getBySlug({ slug }, { signal }),
    ),
  );
}
