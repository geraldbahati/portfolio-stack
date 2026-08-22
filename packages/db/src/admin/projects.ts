import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";

import { createDb } from "../index";
import { auditLog } from "../schema/audit";
import {
  type ProjectBadge,
  type ProjectColor,
  type ProjectDeviceType,
  type ProjectGalleryType,
  type ProjectMediaType,
  project,
  projectChallenges,
  projectDetails,
  projectGallery,
  projectMetrics,
  projectTestimonials,
} from "../schema/project";

type Database = ReturnType<typeof createDb>;

export type AdminProjectStatus = "all" | "published" | "draft";

export type AdminProjectWriteInput = {
  id: string;
  title: string;
  description: string | null;
  src: string;
  type: ProjectMediaType;
  poster: string | null;
  alt: string | null;
  url: string | null;
  badges: ProjectBadge[];
  aspectRatio: string | null;
  sortOrder: number;
  details: {
    tagline: string | null;
    fullDescription: string | null;
    services: string[];
    client: string | null;
    industry: string | null;
    period: string | null;
    year: number | null;
    features: string[];
  };
};

export type AdminMetricInput = { value: string; label: string; icon: string | null };
export type AdminChallengeInput = { title: string; content: string };
export type AdminGalleryInput = {
  src: string;
  alt: string | null;
  caption: string | null;
  galleryType: ProjectGalleryType;
  width: number;
  height: number;
  deviceType: ProjectDeviceType | null;
};
export type AdminTestimonialInput = {
  quote: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  authorImage: string | null;
};

function projectFilters(search: string, status: AdminProjectStatus) {
  const filters = [];
  if (search) {
    const escaped = search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
    const pattern = `%${escaped}%`;
    filters.push(
      or(
        sql<boolean>`${project.title} like ${pattern} escape '\\'`,
        sql<boolean>`${project.id} like ${pattern} escape '\\'`,
      ),
    );
  }
  if (status !== "all") {
    filters.push(eq(project.isPublished, status === "published"));
  }
  return filters.length > 0 ? and(...filters) : undefined;
}

export async function listAdminProjects(
  input: { search: string; status: AdminProjectStatus; page: number; pageSize: number },
  db: Database = createDb(),
) {
  const where = projectFilters(input.search, input.status);
  const offset = (input.page - 1) * input.pageSize;
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: project.id,
        title: project.title,
        description: project.description,
        type: project.type,
        poster: project.poster,
        alt: project.alt,
        url: project.url,
        sortOrder: project.sortOrder,
        isPublished: project.isPublished,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
      .from(project)
      .where(where)
      .orderBy(asc(project.sortOrder), desc(project.updatedAt), asc(project.id))
      .limit(input.pageSize)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(project).where(where),
  ]);

  const total = Number(counts[0]?.total ?? 0);
  return {
    items: rows,
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getAdminProject(id: string, db: Database = createDb()) {
  const rows = await db
    .select({
      project,
      details: projectDetails,
    })
    .from(project)
    .leftJoin(projectDetails, eq(projectDetails.projectId, project.id))
    .where(eq(project.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAdminProjectContent(id: string, db: Database = createDb()) {
  const [base, metrics, challenges, gallery, testimonialRows, projectChoices] = await Promise.all([
    getAdminProject(id, db),
    db
      .select()
      .from(projectMetrics)
      .where(eq(projectMetrics.projectId, id))
      .orderBy(asc(projectMetrics.sortOrder), asc(projectMetrics.id)),
    db
      .select()
      .from(projectChallenges)
      .where(eq(projectChallenges.projectId, id))
      .orderBy(asc(projectChallenges.sortOrder), asc(projectChallenges.id)),
    db
      .select()
      .from(projectGallery)
      .where(eq(projectGallery.projectId, id))
      .orderBy(asc(projectGallery.sortOrder), asc(projectGallery.id)),
    db.select().from(projectTestimonials).where(eq(projectTestimonials.projectId, id)).limit(1),
    db
      .select({ id: project.id, title: project.title, isPublished: project.isPublished })
      .from(project)
      .where(ne(project.id, id))
      .orderBy(asc(project.sortOrder), asc(project.title)),
  ]);

  if (!base) return null;
  return {
    ...base,
    metrics,
    challenges,
    gallery,
    testimonial: testimonialRows[0] ?? null,
    projectChoices,
  };
}

export async function createAdminProject(
  input: AdminProjectWriteInput,
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  await db.batch([
    db.insert(project).values({
      id: input.id,
      title: input.title,
      description: input.description,
      src: input.src,
      type: input.type,
      poster: input.poster,
      alt: input.alt,
      url: input.url,
      badges: input.badges,
      aspectRatio: input.aspectRatio,
      sortOrder: input.sortOrder,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(projectDetails).values({
      projectId: input.id,
      ...input.details,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: "project.create",
      entityType: "project",
      entityId: input.id,
      metadata: { title: input.title },
      createdAt: now,
    }),
  ]);
}

export async function updateAdminProject(
  id: string,
  input: Omit<AdminProjectWriteInput, "id">,
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  await db.batch([
    db
      .update(project)
      .set({
        title: input.title,
        description: input.description,
        src: input.src,
        type: input.type,
        poster: input.poster,
        alt: input.alt,
        url: input.url,
        badges: input.badges,
        aspectRatio: input.aspectRatio,
        sortOrder: input.sortOrder,
        updatedAt: now,
      })
      .where(eq(project.id, id)),
    db
      .insert(projectDetails)
      .values({
        projectId: id,
        ...input.details,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: projectDetails.projectId,
        set: { ...input.details, updatedAt: now },
      }),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: "project.update",
      entityType: "project",
      entityId: id,
      metadata: { title: input.title },
      createdAt: now,
    }),
  ]);
}

export async function setAdminProjectPublication(
  id: string,
  isPublished: boolean,
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  await db.batch([
    db.update(project).set({ isPublished, updatedAt: now }).where(eq(project.id, id)),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: isPublished ? "project.publish" : "project.unpublish",
      entityType: "project",
      entityId: id,
      createdAt: now,
    }),
  ]);
}

export async function replaceAdminProjectMetrics(
  projectId: string,
  items: AdminMetricInput[],
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  const remove = db.delete(projectMetrics).where(eq(projectMetrics.projectId, projectId));
  const audit = db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorEmail,
    action: "project.metrics.replace",
    entityType: "project",
    entityId: projectId,
    metadata: { count: items.length },
    createdAt: now,
  });
  if (items.length === 0) return db.batch([remove, audit]);
  return db.batch([
    remove,
    db.insert(projectMetrics).values(
      items.map((item, sortOrder) => ({
        id: crypto.randomUUID(),
        projectId,
        ...item,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    audit,
  ]);
}

export async function replaceAdminProjectChallenges(
  projectId: string,
  items: AdminChallengeInput[],
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  const remove = db.delete(projectChallenges).where(eq(projectChallenges.projectId, projectId));
  const audit = db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorEmail,
    action: "project.challenges.replace",
    entityType: "project",
    entityId: projectId,
    metadata: { count: items.length },
    createdAt: now,
  });
  if (items.length === 0) return db.batch([remove, audit]);
  return db.batch([
    remove,
    db.insert(projectChallenges).values(
      items.map((item, sortOrder) => ({
        id: crypto.randomUUID(),
        projectId,
        ...item,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    audit,
  ]);
}

export async function replaceAdminProjectGallery(
  projectId: string,
  items: AdminGalleryInput[],
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  const remove = db.delete(projectGallery).where(eq(projectGallery.projectId, projectId));
  const audit = db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorEmail,
    action: "project.gallery.replace",
    entityType: "project",
    entityId: projectId,
    metadata: { count: items.length },
    createdAt: now,
  });
  if (items.length === 0) return db.batch([remove, audit]);
  return db.batch([
    remove,
    db.insert(projectGallery).values(
      items.map((item, sortOrder) => ({
        id: crypto.randomUUID(),
        projectId,
        ...item,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    audit,
  ]);
}

export async function saveAdminProjectTestimonial(
  projectId: string,
  testimonial: AdminTestimonialInput | null,
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  const audit = db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorEmail,
    action: testimonial ? "project.testimonial.save" : "project.testimonial.remove",
    entityType: "project",
    entityId: projectId,
    createdAt: now,
  });
  if (!testimonial) {
    return db.batch([
      db.delete(projectTestimonials).where(eq(projectTestimonials.projectId, projectId)),
      audit,
    ]);
  }
  return db.batch([
    db
      .insert(projectTestimonials)
      .values({ projectId, ...testimonial, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: projectTestimonials.projectId,
        set: { ...testimonial, updatedAt: now },
      }),
    audit,
  ]);
}

export async function saveAdminProjectPresentation(
  projectId: string,
  input: { colorPalette: ProjectColor[]; relatedProjectIds: string[] },
  actorEmail: string,
  db: Database = createDb(),
) {
  const now = new Date();
  return db.batch([
    db
      .insert(projectDetails)
      .values({
        projectId,
        colorPalette: input.colorPalette,
        relatedProjectIds: input.relatedProjectIds,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: projectDetails.projectId,
        set: {
          colorPalette: input.colorPalette,
          relatedProjectIds: input.relatedProjectIds,
          updatedAt: now,
        },
      }),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: "project.presentation.save",
      entityType: "project",
      entityId: projectId,
      metadata: {
        colors: input.colorPalette.length,
        relatedProjects: input.relatedProjectIds.length,
      },
      createdAt: now,
    }),
  ]);
}
