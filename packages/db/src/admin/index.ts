import { desc, isNull, sql } from "drizzle-orm";

import { createDb } from "../index";
import { auditLog } from "../schema/audit";
import { contactSubmission } from "../schema/contact";
import { project } from "../schema/project";

type Database = ReturnType<typeof createDb>;

const asCount = (value: number | string | null | undefined) => Number(value ?? 0);

export async function getAdminOverview(db: Database = createDb()) {
  const [projectCounts, contactCounts, recentProjects, recentContacts, recentActivity] =
    await Promise.all([
      db
        .select({
          total: sql<number>`count(*)`,
          published: sql<number>`sum(case when ${project.isPublished} = 1 then 1 else 0 end)`,
        })
        .from(project),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when ${contactSubmission.status} = 'pending' and ${contactSubmission.archivedAt} is null then 1 else 0 end)`,
          failed: sql<number>`sum(case when ${contactSubmission.status} = 'failed' and ${contactSubmission.archivedAt} is null then 1 else 0 end)`,
          unread: sql<number>`sum(case when ${contactSubmission.readAt} is null and ${contactSubmission.archivedAt} is null then 1 else 0 end)`,
        })
        .from(contactSubmission),
      db
        .select({
          id: project.id,
          title: project.title,
          isPublished: project.isPublished,
          updatedAt: project.updatedAt,
        })
        .from(project)
        .orderBy(desc(project.updatedAt), desc(project.id))
        .limit(5),
      db
        .select({
          id: contactSubmission.id,
          name: contactSubmission.name,
          email: contactSubmission.email,
          status: contactSubmission.status,
          readAt: contactSubmission.readAt,
          createdAt: contactSubmission.createdAt,
        })
        .from(contactSubmission)
        .where(isNull(contactSubmission.archivedAt))
        .orderBy(desc(contactSubmission.createdAt), desc(contactSubmission.id))
        .limit(5),
      db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          actorEmail: auditLog.actorEmail,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(6),
    ]);

  const totalProjects = asCount(projectCounts[0]?.total);
  const publishedProjects = asCount(projectCounts[0]?.published);

  return {
    projects: {
      total: totalProjects,
      published: publishedProjects,
      drafts: Math.max(0, totalProjects - publishedProjects),
    },
    contacts: {
      total: asCount(contactCounts[0]?.total),
      pending: asCount(contactCounts[0]?.pending),
      failed: asCount(contactCounts[0]?.failed),
      unread: asCount(contactCounts[0]?.unread),
    },
    recentProjects,
    recentContacts,
    recentActivity,
  };
}
