import { sanitizeMediaPreviewUrl } from "@portfolio-stack/media";
import { z } from "zod";

const badgeSchema = z.object({
  text: z.string(),
  position: z.enum(["bottom-left", "bottom-right"]).optional(),
});

export const publishedProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  src: z.string(),
  type: z.enum(["video", "gif"]),
  poster: z.string().nullable(),
  alt: z.string().nullable(),
  url: z.string().nullable(),
  badges: z.array(badgeSchema).nullable(),
  aspectRatio: z.string().nullable(),
  sortOrder: z.number(),
  /** ISO-8601. Feeds `<lastmod>` in the sitemap, so it must reflect a real edit. */
  updatedAt: z.string().optional(),
});

export type PublishedProject = z.infer<typeof publishedProjectSchema>;

const colorSchema = z.object({
  hex: z.string(),
  name: z.string().optional(),
});

export const publishedNavSchema = z.object({
  id: z.string(),
  title: z.string(),
});

export const publishedDetailsSchema = z.object({
  heroImage: z.string().nullable(),
  heroAlt: z.string().nullable(),
  tagline: z.string().nullable(),
  fullDescription: z.string().nullable(),
  services: z.array(z.string()).nullable(),
  client: z.string().nullable(),
  industry: z.string().nullable(),
  period: z.string().nullable(),
  year: z.number().nullable(),
  features: z.array(z.string()).nullable(),
  colorPalette: z.array(colorSchema).nullable(),
});

export const publishedGalleryItemSchema = z.object({
  src: z.string(),
  alt: z.string().nullable(),
  caption: z.string().nullable(),
  galleryType: z.enum(["feature", "stack"]),
  width: z.number(),
  height: z.number(),
  deviceType: z.enum(["desktop", "mobile", "tablet", "full-width"]).nullable(),
  sortOrder: z.number(),
});

export const publishedMetricSchema = z.object({
  value: z.string(),
  label: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
});

export const publishedChallengeSchema = z.object({
  title: z.string(),
  content: z.string(),
  sortOrder: z.number(),
});

export const publishedTestimonialSchema = z.object({
  quote: z.string(),
  authorName: z.string(),
  authorRole: z.string().nullable(),
  authorCompany: z.string().nullable(),
  authorImage: z.string().nullable(),
});

export const publishedCaseStudySchema = z.object({
  project: publishedProjectSchema.extend({
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  details: publishedDetailsSchema.nullable(),
  gallery: z.array(publishedGalleryItemSchema),
  metrics: z.array(publishedMetricSchema),
  challenges: z.array(publishedChallengeSchema),
  testimonial: publishedTestimonialSchema.nullable(),
  previous: publishedNavSchema.nullable(),
  next: publishedNavSchema.nullable(),
});

export type PublishedCaseStudy = z.infer<typeof publishedCaseStudySchema>;
export type PublishedNavProject = z.infer<typeof publishedNavSchema>;

export function toPublishedProject(row: {
  id: string;
  title: string;
  description: string | null;
  src: string;
  type: "video" | "gif";
  poster: string | null;
  alt: string | null;
  url: string | null;
  badges: { text: string; position?: "bottom-left" | "bottom-right" }[] | null;
  aspectRatio: string | null;
  sortOrder: number;
  updatedAt?: Date | string | number | null;
}): PublishedProject | null {
  const src = sanitizeMediaPreviewUrl(row.src);
  if (!src) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    src,
    type: row.type,
    poster: sanitizeMediaPreviewUrl(row.poster),
    alt: row.alt,
    url: row.url,
    badges: row.badges,
    aspectRatio: row.aspectRatio,
    sortOrder: row.sortOrder,
    ...(row.updatedAt ? { updatedAt: isoDate(row.updatedAt) } : {}),
  };
}

function isoDate(value: Date | string | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  return new Date(value).toISOString();
}

export function toPublishedCaseStudy(input: {
  project: Parameters<typeof toPublishedProject>[0] & {
    createdAt: Date | string | number;
    updatedAt: Date | string | number;
  };
  details: {
    heroImage: string | null;
    heroAlt: string | null;
    tagline: string | null;
    fullDescription: string | null;
    services: string[] | null;
    client: string | null;
    industry: string | null;
    period: string | null;
    year: number | null;
    features: string[] | null;
    colorPalette: { hex: string; name?: string }[] | null;
  } | null;
  gallery: Array<{
    src: string;
    alt: string | null;
    caption: string | null;
    galleryType: "feature" | "stack";
    width: number;
    height: number;
    deviceType: "desktop" | "mobile" | "tablet" | "full-width" | null;
    sortOrder: number;
  }>;
  metrics: Array<{
    value: string;
    label: string;
    icon: string | null;
    sortOrder: number;
  }>;
  challenges: Array<{
    title: string;
    content: string;
    sortOrder: number;
  }>;
  testimonial: {
    quote: string;
    authorName: string;
    authorRole: string | null;
    authorCompany: string | null;
    authorImage: string | null;
  } | null;
  previous: PublishedNavProject | null;
  next: PublishedNavProject | null;
}): PublishedCaseStudy | null {
  const project = toPublishedProject(input.project);
  if (!project) {
    return null;
  }

  const details = input.details
    ? {
        heroImage: sanitizeMediaPreviewUrl(input.details.heroImage),
        heroAlt: input.details.heroAlt,
        tagline: input.details.tagline,
        fullDescription: input.details.fullDescription,
        services: input.details.services,
        client: input.details.client,
        industry: input.details.industry,
        period: input.details.period,
        year: input.details.year,
        features: input.details.features,
        colorPalette: input.details.colorPalette,
      }
    : null;

  const testimonial = input.testimonial
    ? {
        quote: input.testimonial.quote,
        authorName: input.testimonial.authorName,
        authorRole: input.testimonial.authorRole,
        authorCompany: input.testimonial.authorCompany,
        authorImage: sanitizeMediaPreviewUrl(input.testimonial.authorImage),
      }
    : null;

  return {
    project: {
      ...project,
      createdAt: isoDate(input.project.createdAt),
      updatedAt: isoDate(input.project.updatedAt),
    },
    details,
    gallery: input.gallery.flatMap((item) => {
      const src = sanitizeMediaPreviewUrl(item.src);
      return src ? [{ ...item, src }] : [];
    }),
    metrics: input.metrics,
    challenges: input.challenges,
    testimonial,
    previous: input.previous,
    next: input.next,
  };
}
