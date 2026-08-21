import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type ProjectMediaType = "video" | "gif";
export type ProjectBadgePosition = "bottom-left" | "bottom-right";
export type ProjectGalleryType = "feature" | "stack";
export type ProjectDeviceType = "desktop" | "mobile" | "tablet" | "full-width";

export type ProjectBadge = {
  text: string;
  position?: ProjectBadgePosition;
};

export type ProjectColor = {
  hex: string;
  name?: string;
};

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

const updatedTimestamp = (name: string) =>
  timestamp(name).$onUpdate(() => /* @__PURE__ */ new Date());

export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    src: text("src").notNull(),
    type: text("type").$type<ProjectMediaType>().notNull(),
    poster: text("poster"),
    alt: text("alt"),
    url: text("url"),
    badges: text("badges", { mode: "json" }).$type<ProjectBadge[]>(),
    aspectRatio: text("aspect_ratio"),
    sortOrder: integer("sort_order").notNull(),
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
    createdAt: timestamp("created_at"),
    updatedAt: updatedTimestamp("updated_at"),
  },
  (table) => [
    index("project_published_order_idx").on(table.isPublished, table.sortOrder),
    index("project_order_idx").on(table.sortOrder),
  ],
);

export const projectDetails = sqliteTable("project_details", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => project.id, { onDelete: "cascade" }),
  heroImage: text("hero_image"),
  heroAlt: text("hero_alt"),
  tagline: text("tagline"),
  fullDescription: text("full_description"),
  services: text("services", { mode: "json" }).$type<string[]>(),
  client: text("client"),
  industry: text("industry"),
  period: text("period"),
  year: integer("year"),
  features: text("features", { mode: "json" }).$type<string[]>(),
  colorPalette: text("color_palette", { mode: "json" }).$type<ProjectColor[]>(),
  relatedProjectIds: text("related_project_ids", { mode: "json" }).$type<string[]>(),
  createdAt: timestamp("created_at"),
  updatedAt: updatedTimestamp("updated_at"),
});

export const projectGallery = sqliteTable(
  "project_gallery",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    src: text("src").notNull(),
    alt: text("alt"),
    caption: text("caption"),
    galleryType: text("gallery_type").$type<ProjectGalleryType>().notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    deviceType: text("device_type").$type<ProjectDeviceType>(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: updatedTimestamp("updated_at"),
  },
  (table) => [
    index("project_gallery_project_order_idx").on(table.projectId, table.sortOrder),
    index("project_gallery_project_type_idx").on(table.projectId, table.galleryType),
  ],
);

export const projectMetrics = sqliteTable(
  "project_metrics",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    label: text("label").notNull(),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: updatedTimestamp("updated_at"),
  },
  (table) => [index("project_metrics_project_order_idx").on(table.projectId, table.sortOrder)],
);

export const projectChallenges = sqliteTable(
  "project_challenges",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: updatedTimestamp("updated_at"),
  },
  (table) => [index("project_challenges_project_order_idx").on(table.projectId, table.sortOrder)],
);

export const projectTestimonials = sqliteTable("project_testimonials", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => project.id, { onDelete: "cascade" }),
  quote: text("quote").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role"),
  authorCompany: text("author_company"),
  authorImage: text("author_image"),
  createdAt: timestamp("created_at"),
  updatedAt: updatedTimestamp("updated_at"),
});
