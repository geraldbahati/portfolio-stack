import { z } from "zod";

export const adminMessageIdSchema = z.string().trim().uuid();

export const adminMessageListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(["all", "pending", "sent", "delivered", "failed"]).default("all"),
  view: z.enum(["inbox", "archived", "all"]).default("inbox"),
  read: z.enum(["all", "read", "unread"]).default("all"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const adminMessageActionSchema = z.object({
  id: adminMessageIdSchema,
  action: z.enum(["mark-read", "mark-unread", "archive", "restore", "delete"]),
  confirmation: z.string().default(""),
});

export function canDeleteMessage(id: string, confirmation: string) {
  return confirmation === id;
}
