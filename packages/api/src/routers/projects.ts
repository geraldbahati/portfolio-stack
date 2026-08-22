import { getPublishedProjectBySlug, listPublishedProjects } from "@portfolio-stack/db/projects";
import { z } from "zod";

import { publicProcedure } from "../index";
import { toPublishedCaseStudy, toPublishedProject } from "../schemas/published-project";

export type { PublishedCaseStudy, PublishedProject } from "../schemas/published-project";
export {
  publishedCaseStudySchema,
  publishedProjectSchema,
  toPublishedCaseStudy,
  toPublishedProject,
} from "../schemas/published-project";

export const projectsRouter = {
  listPublished: publicProcedure.handler(async () => {
    const rows = await listPublishedProjects();
    return rows.flatMap((row) => {
      const published = toPublishedProject(row);
      return published ? [published] : [];
    });
  }),
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .handler(async ({ input }) => {
      const row = await getPublishedProjectBySlug(input.slug);
      if (!row) {
        return null;
      }
      return toPublishedCaseStudy(row);
    }),
};
