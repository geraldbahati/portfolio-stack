import { eq } from "drizzle-orm";
import type { createDb } from "../index";
import {
  type ProjectBadge,
  type ProjectMediaType,
  project,
  projectChallenges,
  projectDetails,
  projectGallery,
  projectMetrics,
} from "../schema/project";
import { SEED_CASE_STUDIES } from "./case-studies";

const STREAM = "https://customer-pdxnd9di8ybc2kur.cloudflarestream.com";

const LANDING_UID = "5874f6a9938431958ee99e5c9354c9b5";
const STORE_UID = "462887d50ef66397070188e779015139";
const THERAPY_UID = "0cebe7045b8e2bd0e613923c157287d8";

const hls = (uid: string) => `${STREAM}/${uid}/manifest/video.m3u8`;
const thumb = (uid: string) => `${STREAM}/${uid}/thumbnails/thumbnail.jpg`;

export type SeedProject = {
  id: string;
  title: string;
  description: string;
  src: string;
  type: ProjectMediaType;
  poster: string;
  alt: string;
  url: string;
  badges: ProjectBadge[];
  aspectRatio: string;
  sortOrder: number;
  isPublished: boolean;
};

export const SEED_PROJECTS: SeedProject[] = [
  {
    id: "webline-technologies",
    title: "Webline Technologies",
    description:
      "Corporate site for a Nairobi technology integrator, built as a scroll-driven narrative with pinned scenes and a multi-zone architecture that hands off seamlessly to the storefront.",
    src: hls(LANDING_UID),
    type: "video",
    poster: thumb(LANDING_UID),
    alt: "Webline Technologies corporate site — scroll-driven service narrative",
    url: "https://webline.co.ke",
    badges: [
      { text: "Corporate Site", position: "bottom-left" },
      { text: "Motion Design", position: "bottom-right" },
    ],
    aspectRatio: "16/9",
    sortOrder: 0,
    isPublished: true,
  },
  {
    id: "webline-store",
    title: "Webline Store",
    description:
      "Edge-first e-commerce storefront on Cloudflare Workers — partial prerendering, tag-driven cache invalidation, dynamic product variants and AI-assisted recommendations.",
    src: hls(STORE_UID),
    type: "video",
    poster: thumb(STORE_UID),
    alt: "Webline Store — edge-first e-commerce storefront",
    url: "https://webline.co.ke/store",
    badges: [
      { text: "E-commerce", position: "bottom-left" },
      { text: "Edge / Workers", position: "bottom-right" },
    ],
    aspectRatio: "16/9",
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: "therapy-in-kenya",
    title: "Therapy in Kenya",
    description:
      "Booking and practice platform for a Nairobi counsellor — guest booking without accounts, M-Pesa payments, SMS reminders and a realtime dashboard on Cloudflare Workers.",
    src: hls(THERAPY_UID),
    type: "video",
    poster: thumb(THERAPY_UID),
    alt: "Therapy in Kenya — counselling booking platform",
    url: "https://therapy-moffat-demo.vercel.app",
    badges: [
      { text: "Healthcare", position: "bottom-left" },
      { text: "Payments & SMS", position: "bottom-right" },
    ],
    aspectRatio: "16/9",
    sortOrder: 2,
    isPublished: true,
  },
];

export async function seedPublishedProjects(database: ReturnType<typeof createDb>) {
  const now = new Date();
  for (const entry of SEED_PROJECTS) {
    await database
      .insert(project)
      .values({
        ...entry,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: project.id,
        set: {
          title: entry.title,
          description: entry.description,
          src: entry.src,
          type: entry.type,
          poster: entry.poster,
          alt: entry.alt,
          url: entry.url,
          badges: entry.badges,
          aspectRatio: entry.aspectRatio,
          sortOrder: entry.sortOrder,
          isPublished: entry.isPublished,
          updatedAt: now,
        },
      });
  }

  for (const study of SEED_CASE_STUDIES) {
    await database
      .insert(projectDetails)
      .values({
        projectId: study.projectId,
        ...study.details,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: projectDetails.projectId,
        set: {
          ...study.details,
          updatedAt: now,
        },
      });

    await database.delete(projectMetrics).where(eq(projectMetrics.projectId, study.projectId));
    if (study.metrics.length > 0) {
      await database.insert(projectMetrics).values(
        study.metrics.map((metric, index) => ({
          id: `${study.projectId}:metric:${index}`,
          projectId: study.projectId,
          value: metric.value,
          label: metric.label,
          icon: metric.icon ?? null,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    await database
      .delete(projectChallenges)
      .where(eq(projectChallenges.projectId, study.projectId));
    if (study.challenges.length > 0) {
      await database.insert(projectChallenges).values(
        study.challenges.map((challenge, index) => ({
          id: `${study.projectId}:challenge:${index}`,
          projectId: study.projectId,
          title: challenge.title,
          content: challenge.content,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    await database.delete(projectGallery).where(eq(projectGallery.projectId, study.projectId));
    if (study.gallery.length > 0) {
      await database.insert(projectGallery).values(
        study.gallery.map((item, index) => ({
          id: `${study.projectId}:gallery:${index}`,
          projectId: study.projectId,
          src: item.src,
          alt: item.alt,
          caption: item.caption,
          galleryType: item.galleryType,
          width: item.width,
          height: item.height,
          deviceType: item.deviceType,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
  }

  return { upserted: SEED_PROJECTS.length, caseStudies: SEED_CASE_STUDIES.length };
}
