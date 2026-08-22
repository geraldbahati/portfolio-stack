import { z } from "zod";

export const adminActivityCategorySchema = z
  .enum(["all", "project", "message", "media", "settings", "stream"])
  .default("all");

export const adminActivityListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  category: adminActivityCategorySchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(30),
});

export function auditActionLabel(action: string) {
  return action
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ");
}

export function auditMetadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata) return [];
  const summary: string[] = [];
  if (Array.isArray(metadata.changedFields)) {
    const fields = metadata.changedFields.filter(
      (field): field is string => typeof field === "string",
    );
    if (fields.length > 0) summary.push(`Fields: ${fields.join(", ")}`);
  }
  if (typeof metadata.count === "number") summary.push(`${metadata.count} items`);
  if (typeof metadata.contentType === "string") summary.push(metadata.contentType);
  if (typeof metadata.size === "number") summary.push(`${metadata.size} bytes`);
  if (typeof metadata.title === "string") summary.push(`Project: ${metadata.title}`);
  return summary;
}
