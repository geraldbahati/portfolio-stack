import { and, asc, eq } from "drizzle-orm";

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
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, slug), eq(project.isPublished, true)))
    .limit(1);

  if (!row) {
    return null;
  }

  const [published, detailsRows, gallery, metrics, challenges, testimonialRows] = await Promise.all(
    [
      listPublishedProjects(db),
      db.select().from(projectDetails).where(eq(projectDetails.projectId, slug)).limit(1),
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
      db.select().from(projectTestimonials).where(eq(projectTestimonials.projectId, slug)).limit(1),
    ],
  );

  const index = published.findIndex((entry) => entry.id === slug);
  const previous = index > 0 ? published[index - 1] : undefined;
  const next = index >= 0 && index < published.length - 1 ? published[index + 1] : undefined;

  return {
    project: row,
    details: detailsRows[0] ?? null,
    gallery,
    metrics,
    challenges,
    testimonial: testimonialRows[0] ?? null,
    previous: previous ? { id: previous.id, title: previous.title } : null,
    next: next ? { id: next.id, title: next.title } : null,
  };
}
