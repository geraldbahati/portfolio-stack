import { ORPCError } from "@orpc/server";
import { parseTrustedOrigins, streamAllowedOrigins } from "@portfolio-stack/auth";
import { writeAuditLog } from "@portfolio-stack/db/audit";
import { env } from "@portfolio-stack/env/server";
import { DEFAULT_STREAM_CUSTOMER, getStreamVideoUrls } from "@portfolio-stack/media";
import { z } from "zod";

import { adminProcedure } from "../index";

type StreamDirectUploadResponse = {
  success: boolean;
  errors?: { message?: string }[];
  result?: {
    uploadURL: string;
    uid: string;
  };
};

function streamConfig() {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message:
        "Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
    });
  }
  return { accountId, apiToken };
}

function allowedStreamOrigins() {
  return streamAllowedOrigins(parseTrustedOrigins(env.CORS_ORIGIN));
}

export const streamRouter = {
  generateStreamUploadUrl: adminProcedure
    .input(
      z
        .object({
          maxDurationSeconds: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .handler(async ({ context, input }) => {
      const { accountId, apiToken } = streamConfig();

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            maxDurationSeconds: input?.maxDurationSeconds ?? 3600,
            allowedOrigins: allowedStreamOrigins(),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Stream] Failed to generate upload URL:", errorText);
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to generate Stream upload URL",
        });
      }

      const data = (await response.json()) as StreamDirectUploadResponse;
      if (!data.success || !data.result) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: data.errors?.[0]?.message || "Stream API error",
        });
      }

      await writeAuditLog({
        actorEmail: context.session.user.email,
        action: "stream.direct_upload",
        entityType: "stream_video",
        entityId: data.result.uid,
      });

      return {
        uploadUrl: data.result.uploadURL,
        uid: data.result.uid,
        urls: getStreamVideoUrls(data.result.uid, DEFAULT_STREAM_CUSTOMER),
      };
    }),

  deleteVideo: adminProcedure
    .input(z.object({ uid: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const { accountId, apiToken } = streamConfig();

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${input.uid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Stream] Failed to delete video:", errorText);
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to delete Stream video",
        });
      }

      await writeAuditLog({
        actorEmail: context.session.user.email,
        action: "stream.delete",
        entityType: "stream_video",
        entityId: input.uid,
      });

      return { ok: true as const };
    }),
};
