import { ORPCError } from "@orpc/server";
import {
  deleteAdminMessage,
  getAdminMessage,
  listAdminMessages,
  setAdminMessageArchived,
  setAdminMessageRead,
} from "@portfolio-stack/db/admin/messages";
import { z } from "zod";

import { adminProcedure } from "../../index";
import {
  adminMessageActionSchema,
  adminMessageIdSchema,
  adminMessageListSchema,
  canDeleteMessage,
} from "../../schemas/admin/message";

export const adminMessagesRouter = {
  list: adminProcedure
    .input(adminMessageListSchema)
    .handler(async ({ input }) => listAdminMessages(input)),
  get: adminProcedure
    .input(z.object({ id: adminMessageIdSchema }))
    .handler(async ({ input }) => getAdminMessage(input.id)),
  action: adminProcedure.input(adminMessageActionSchema).handler(async ({ input, context }) => {
    const existing = await getAdminMessage(input.id);
    if (!existing) throw new ORPCError("NOT_FOUND");

    if (input.action === "delete") {
      if (!canDeleteMessage(input.id, input.confirmation)) {
        throw new ORPCError("BAD_REQUEST", { message: "The confirmation does not match." });
      }
      await deleteAdminMessage(input.id, context.session.user.email);
      return { id: input.id, deleted: true };
    }

    if (input.action === "mark-read" || input.action === "mark-unread") {
      await setAdminMessageRead(input.id, input.action === "mark-read", context.session.user.email);
    } else {
      await setAdminMessageArchived(
        input.id,
        input.action === "archive",
        context.session.user.email,
      );
    }

    return { id: input.id, deleted: false };
  }),
};
