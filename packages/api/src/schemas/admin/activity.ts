import { z } from "zod";

export const adminActivityCategorySchema = z
  .enum(["all", "auth", "project", "message", "media", "settings", "stream"])
  .default("all");

export const adminActivityListSchema = z
  .object({
    search: z.string().trim().max(120).default(""),
    category: adminActivityCategorySchema,
    /** Inclusive calendar dates in the admin time zone. */
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    /** Opaque keyset position returned by the previous page. */
    cursor: z.string().max(100).optional(),
    direction: z.enum(["older", "newer"]).default("older"),
    pageSize: z.number().int().min(1).max(100).default(30),
    includeTotal: z.boolean().default(false),
  })
  .refine((input) => !input.from || !input.to || input.from <= input.to, {
    message: "The start date must not be after the end date.",
    path: ["to"],
  });

export function auditOutcomeLabel(outcome: string) {
  if (outcome === "pending") return "In progress";
  if (outcome === "failed") return "Failed";
  return "Succeeded";
}

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
  if (typeof metadata.reason === "string")
    summary.push(`Reason: ${metadata.reason.replaceAll("_", " ")}`);
  if (metadata.reconciled === true) summary.push("Resolved by reconciliation");
  return summary;
}
