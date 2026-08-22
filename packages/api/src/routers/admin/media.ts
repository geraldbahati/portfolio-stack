import { ORPCError } from "@orpc/server";
import { writeAuditLog } from "@portfolio-stack/db/audit";
import { env } from "@portfolio-stack/env/server";
import { DEFAULT_MEDIA_ORIGIN } from "@portfolio-stack/media";
import { publicMediaUrl } from "@portfolio-stack/media/admin";

import { adminProcedure } from "../../index";
import {
  adminMediaDeleteSchema,
  adminMediaListSchema,
  canDeleteMedia,
} from "../../schemas/admin/media";

export const adminMediaRouter = {
  list: adminProcedure.input(adminMediaListSchema).handler(async ({ input }) => {
    const result = await env.MEDIA.list({
      limit: input.limit,
      cursor: input.cursor || undefined,
      prefix: input.prefix === "all" ? undefined : `${input.prefix}/`,
      include: ["httpMetadata", "customMetadata"],
    });
    const previewOrigin = env.BETTER_AUTH_URL.endsWith("/")
      ? env.BETTER_AUTH_URL
      : `${env.BETTER_AUTH_URL}/`;
    const mediaOrigin = env.MEDIA_PUBLIC_ORIGIN || DEFAULT_MEDIA_ORIGIN;

    return {
      objects: result.objects.map((object) => {
        const previewUrl = new URL("internal/admin-media/object", previewOrigin);
        previewUrl.searchParams.set("key", object.key);
        return {
          key: object.key,
          size: object.size,
          uploaded: object.uploaded.toISOString(),
          etag: object.etag,
          contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
          alt: object.customMetadata?.alt ?? "",
          originalName: object.customMetadata?.originalName ?? "",
          publicUrl: publicMediaUrl(mediaOrigin, object.key),
          previewUrl: previewUrl.toString(),
        };
      }),
      truncated: result.truncated,
      cursor: result.truncated ? result.cursor : "",
    };
  }),
  delete: adminProcedure.input(adminMediaDeleteSchema).handler(async ({ input, context }) => {
    if (!canDeleteMedia(input.key, input.confirmation)) {
      throw new ORPCError("BAD_REQUEST", { message: "The confirmation does not match." });
    }

    const object = await env.MEDIA.head(input.key);
    if (!object) throw new ORPCError("NOT_FOUND");
    const auditInput = {
      actorEmail: context.session.user.email,
      entityType: "media",
      entityId: input.key,
      metadata: {
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
        size: object.size,
      },
    };
    await writeAuditLog({ ...auditInput, action: "media.delete.requested" });
    await env.MEDIA.delete(input.key);
    await writeAuditLog({ ...auditInput, action: "media.delete" });
    return { key: input.key, deleted: true };
  }),
};
