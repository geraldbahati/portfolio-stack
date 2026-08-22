import { isSafeAdminMediaKey } from "@portfolio-stack/media/admin";
import { z } from "zod";

export const adminMediaPrefixSchema = z
  .enum(["all", "projects", "gallery", "portraits", "uploads"])
  .default("all");

export const adminMediaListSchema = z.object({
  prefix: adminMediaPrefixSchema,
  cursor: z.string().trim().max(2048).default(""),
  limit: z.number().int().min(1).max(100).default(48),
});

export const adminMediaKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(isSafeAdminMediaKey, "Invalid media key.");

export const adminMediaDeleteSchema = z.object({
  key: adminMediaKeySchema,
  confirmation: z.string(),
});

export function canDeleteMedia(key: string, confirmation: string) {
  return key === confirmation;
}
