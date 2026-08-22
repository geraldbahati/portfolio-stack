import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const siteSettings = sqliteTable("site_settings", {
  id: text("id").primaryKey(),
  professionalTitle: text("professional_title").notNull(),
  location: text("location").notNull(),
  businessHours: text("business_hours").notNull(),
  availability: text("availability").notNull(),
  instagramUrl: text("instagram_url"),
  linkedinUrl: text("linkedin_url"),
  xUrl: text("x_url"),
  whatsappUrl: text("whatsapp_url"),
  githubUrl: text("github_url"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});
