import { sanitizeMediaPreviewUrl } from "@portfolio-stack/media";
import { z } from "zod";

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const nullableUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .nullable()
  .refine((value) => value === null || new URL(value).protocol === "https:", {
    message: "Use an HTTPS URL.",
  });
const nullableMediaUrl = z
  .string()
  .trim()
  .max(2048)
  .nullable()
  .refine((value) => value === null || sanitizeMediaPreviewUrl(value) !== null, {
    message: "Use an approved HTTPS media URL.",
  });

export const adminProjectIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

export const adminProjectDetailsSchema = z.object({
  tagline: nullableText(180),
  fullDescription: nullableText(20_000),
  services: z.array(z.string().trim().min(1).max(80)).max(20),
  client: nullableText(120),
  industry: nullableText(120),
  period: nullableText(80),
  year: z.number().int().min(1990).max(2200).nullable(),
  features: z.array(z.string().trim().min(1).max(180)).max(30),
});

export const adminProjectWriteSchema = z.object({
  id: adminProjectIdSchema,
  title: z.string().trim().min(2).max(120),
  description: nullableText(1_000),
  src: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => sanitizeMediaPreviewUrl(value) !== null, {
      message: "Use an approved HTTPS media URL.",
    }),
  type: z.enum(["video", "gif"]),
  poster: nullableMediaUrl,
  alt: nullableText(240),
  url: nullableUrl,
  badges: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(40),
        position: z.enum(["bottom-left", "bottom-right"]).optional(),
      }),
    )
    .max(6),
  aspectRatio: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/)
    .max(20)
    .nullable(),
  sortOrder: z.number().int().min(0).max(10_000),
  details: adminProjectDetailsSchema,
});

export const adminProjectUpdateSchema = adminProjectWriteSchema.omit({ id: true }).extend({
  id: adminProjectIdSchema,
});

export const adminMetricSchema = z.object({
  value: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  icon: nullableText(80),
});

export const adminChallengeSchema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(2).max(20_000),
});

export const adminGalleryItemSchema = z.object({
  src: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => sanitizeMediaPreviewUrl(value) !== null, {
      message: "Use an approved HTTPS media URL.",
    }),
  galleryType: z.enum(["feature", "stack"]),
  deviceType: z.enum(["desktop", "mobile", "tablet", "full-width"]).nullable(),
  width: z.number().int().min(1).max(20_000),
  height: z.number().int().min(1).max(20_000),
  alt: nullableText(240),
  caption: nullableText(500),
});

export const adminTestimonialSchema = z.object({
  quote: z.string().trim().min(2).max(2_000),
  authorName: z.string().trim().min(2).max(120),
  authorRole: nullableText(120),
  authorCompany: nullableText(120),
  authorImage: nullableMediaUrl,
});

export const adminPresentationSchema = z.object({
  colorPalette: z
    .array(
      z.object({
        hex: z
          .string()
          .trim()
          .regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color."),
        name: z.string().trim().min(1).max(80).optional(),
      }),
    )
    .max(12),
  relatedProjectIds: z.array(adminProjectIdSchema).max(12),
});

export type AdminProjectWrite = z.infer<typeof adminProjectWriteSchema>;

export type PublishableProject = {
  project: {
    title: string;
    description: string | null;
    src: string;
    alt: string | null;
  };
  details: {
    tagline: string | null;
    fullDescription: string | null;
    services: string[] | null;
  } | null;
};

export function projectPublishIssues(value: PublishableProject): string[] {
  const issues: string[] = [];
  if (!value.project.title.trim()) issues.push("Add a project title.");
  if (!value.project.description?.trim()) issues.push("Add a project summary.");
  if (!sanitizeMediaPreviewUrl(value.project.src)) issues.push("Add a valid project media URL.");
  if (!value.project.alt?.trim()) issues.push("Add descriptive media alt text.");
  if (!value.details?.tagline?.trim()) issues.push("Add a case-study tagline.");
  if (!value.details?.fullDescription?.trim()) issues.push("Add the full case-study description.");
  if (!value.details?.services?.length) issues.push("Add at least one service.");
  return issues;
}

export function canReplaceCollection(input: {
  currentCount: number;
  nextCount: number;
  confirmation: string;
  projectId: string;
}) {
  return input.currentCount === 0 || input.nextCount > 0 || input.confirmation === input.projectId;
}
