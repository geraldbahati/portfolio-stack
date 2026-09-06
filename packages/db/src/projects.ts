import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";

import { createDb } from "./index";
import {
  project,
  projectChallenges,
  projectDetails,
  projectGallery,
  projectMetrics,
  projectTestimonials,
} from "./schema/project";

type Database = ReturnType<typeof createDb>;

export function listPublishedProjects(db: Database = createDb()) {
  return db
    .select()
    .from(project)
    .where(eq(project.isPublished, true))
    .orderBy(asc(project.sortOrder), asc(project.id));
}

export async function getPublishedProjectBySlug(slug: string, db: Database = createDb()) {
  // These two relations are one-to-one: joining them cannot multiply rows.
  const [record] = await db
    .select({ project, details: projectDetails, testimonial: projectTestimonials })
    .from(project)
    .leftJoin(projectDetails, eq(projectDetails.projectId, project.id))
    .leftJoin(projectTestimonials, eq(projectTestimonials.projectId, project.id))
    .where(and(eq(project.id, slug), eq(project.isPublished, true)))
    .limit(1);

  if (!record) return null;

  const row = record.project;
  // Fetch only the immediate neighbors, including stable id ordering for ties.
  // D1 executes the remaining reads in one batch instead of five HTTP trips.
  const [previousRows, nextRows, gallery, metrics, challenges] = await db.batch([
    db
      .select({ id: project.id, title: project.title })
      .from(project)
      .where(
        and(
          eq(project.isPublished, true),
          or(
            lt(project.sortOrder, row.sortOrder),
            and(eq(project.sortOrder, row.sortOrder), lt(project.id, slug)),
          ),
        ),
      )
      .orderBy(desc(project.sortOrder), desc(project.id))
      .limit(1),
    db
      .select({ id: project.id, title: project.title })
      .from(project)
      .where(
        and(
          eq(project.isPublished, true),
          or(
            gt(project.sortOrder, row.sortOrder),
            and(eq(project.sortOrder, row.sortOrder), gt(project.id, slug)),
          ),
        ),
      )
      .orderBy(asc(project.sortOrder), asc(project.id))
      .limit(1),
    db
      .select()
      .from(projectGallery)
      .where(eq(projectGallery.projectId, slug))
      .orderBy(asc(projectGallery.sortOrder), asc(projectGallery.id)),
    db
      .select()
      .from(projectMetrics)
      .where(eq(projectMetrics.projectId, slug))
      .orderBy(asc(projectMetrics.sortOrder), asc(projectMetrics.id)),
    db
      .select()
      .from(projectChallenges)
      .where(eq(projectChallenges.projectId, slug))
      .orderBy(asc(projectChallenges.sortOrder), asc(projectChallenges.id)),
  ]);

  return {
    project: row,
    details: record.details,
    gallery,
    metrics,
    challenges,
    testimonial: record.testimonial,
    previous: previousRows[0] ?? null,
    next: nextRows[0] ?? null,
  };
}
