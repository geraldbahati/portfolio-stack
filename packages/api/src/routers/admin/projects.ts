import { ORPCError } from "@orpc/server";
import {
  createAdminProject,
  getAdminProject,
  getAdminProjectContent,
  listAdminProjects,
  replaceAdminProjectChallenges,
  replaceAdminProjectGallery,
  replaceAdminProjectMetrics,
  saveAdminProjectPresentation,
  saveAdminProjectTestimonial,
  setAdminProjectPublication,
  updateAdminProject,
} from "@portfolio-stack/db/admin/projects";
import { z } from "zod";

import { adminProcedure } from "../../index";
import {
  adminChallengeSchema,
  adminGalleryItemSchema,
  adminMetricSchema,
  adminPresentationSchema,
  adminProjectIdSchema,
  adminProjectUpdateSchema,
  adminProjectWriteSchema,
  adminTestimonialSchema,
  canReplaceCollection,
  projectPublishIssues,
} from "../../schemas/admin/project";

export const adminProjectsRouter = {
  list: adminProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        status: z.enum(["all", "published", "draft"]).default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .handler(async ({ input }) => listAdminProjects(input)),
  get: adminProcedure
    .input(z.object({ id: adminProjectIdSchema }))
    .handler(async ({ input }) => getAdminProject(input.id)),
  content: adminProcedure
    .input(z.object({ id: adminProjectIdSchema }))
    .handler(async ({ input }) => getAdminProjectContent(input.id)),
  create: adminProcedure.input(adminProjectWriteSchema).handler(async ({ input, context }) => {
    if (await getAdminProject(input.id)) {
      throw new ORPCError("CONFLICT", { message: "A project with this slug already exists." });
    }
    await createAdminProject(input, context.session.user.email);
    return { id: input.id };
  }),
  update: adminProcedure.input(adminProjectUpdateSchema).handler(async ({ input, context }) => {
    const existing = await getAdminProject(input.id);
    if (!existing) throw new ORPCError("NOT_FOUND");
    const { id, ...patch } = input;
    await updateAdminProject(id, patch, context.session.user.email);
    return { id };
  }),
  publication: adminProcedure
    .input(
      z.object({
        id: adminProjectIdSchema,
        publish: z.boolean(),
        confirmation: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const existing = await getAdminProject(input.id);
      if (!existing) throw new ORPCError("NOT_FOUND");
      if (input.confirmation !== input.id) {
        throw new ORPCError("BAD_REQUEST", { message: "The confirmation does not match." });
      }
      if (input.publish) {
        const issues = projectPublishIssues(existing);
        if (issues.length > 0) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Project is not ready to publish: ${issues.join(" ")}`,
          });
        }
      }
      await setAdminProjectPublication(input.id, input.publish, context.session.user.email);
      return { id: input.id, isPublished: input.publish };
    }),
  replaceMetrics: adminProcedure
    .input(
      z.object({
        id: adminProjectIdSchema,
        items: z.array(adminMetricSchema).max(20),
        confirmation: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const content = await getAdminProjectContent(input.id);
      if (!content) throw new ORPCError("NOT_FOUND");
      if (
        !canReplaceCollection({
          currentCount: content.metrics.length,
          nextCount: input.items.length,
          confirmation: input.confirmation,
          projectId: input.id,
        })
      ) {
        throw new ORPCError("BAD_REQUEST", { message: "Confirm before clearing metrics." });
      }
      await replaceAdminProjectMetrics(input.id, input.items, context.session.user.email);
      return { count: input.items.length };
    }),
  replaceChallenges: adminProcedure
    .input(
      z.object({
        id: adminProjectIdSchema,
        items: z.array(adminChallengeSchema).max(20),
        confirmation: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const content = await getAdminProjectContent(input.id);
      if (!content) throw new ORPCError("NOT_FOUND");
      if (
        !canReplaceCollection({
          currentCount: content.challenges.length,
          nextCount: input.items.length,
          confirmation: input.confirmation,
          projectId: input.id,
        })
      ) {
        throw new ORPCError("BAD_REQUEST", { message: "Confirm before clearing challenges." });
      }
      await replaceAdminProjectChallenges(input.id, input.items, context.session.user.email);
      return { count: input.items.length };
    }),
  replaceGallery: adminProcedure
    .input(
      z.object({
        id: adminProjectIdSchema,
        items: z.array(adminGalleryItemSchema).max(40),
        confirmation: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const content = await getAdminProjectContent(input.id);
      if (!content) throw new ORPCError("NOT_FOUND");
      if (
        !canReplaceCollection({
          currentCount: content.gallery.length,
          nextCount: input.items.length,
          confirmation: input.confirmation,
          projectId: input.id,
        })
      ) {
        throw new ORPCError("BAD_REQUEST", { message: "Confirm before clearing the gallery." });
      }
      await replaceAdminProjectGallery(input.id, input.items, context.session.user.email);
      return { count: input.items.length };
    }),
  saveTestimonial: adminProcedure
    .input(
      z.object({
        id: adminProjectIdSchema,
        testimonial: adminTestimonialSchema.nullable(),
        confirmation: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!(await getAdminProject(input.id))) throw new ORPCError("NOT_FOUND");
      if (!input.testimonial && input.confirmation !== input.id) {
        throw new ORPCError("BAD_REQUEST", { message: "The confirmation does not match." });
      }
      await saveAdminProjectTestimonial(input.id, input.testimonial, context.session.user.email);
      return { present: input.testimonial !== null };
    }),
  savePresentation: adminProcedure
    .input(adminPresentationSchema.extend({ id: adminProjectIdSchema }))
    .handler(async ({ input, context }) => {
      const content = await getAdminProjectContent(input.id);
      if (!content) throw new ORPCError("NOT_FOUND");
      const allowed = new Set(content.projectChoices.map((choice) => choice.id));
      if (input.relatedProjectIds.some((id) => !allowed.has(id))) {
        throw new ORPCError("BAD_REQUEST", { message: "A related project is invalid." });
      }
      await saveAdminProjectPresentation(
        input.id,
        {
          colorPalette: input.colorPalette,
          relatedProjectIds: [...new Set(input.relatedProjectIds)],
        },
        context.session.user.email,
      );
      return { saved: true };
    }),
};
