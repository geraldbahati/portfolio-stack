import { ORPCError } from "@orpc/server";
import { parseTrustedOrigins, streamAllowedOrigins } from "@portfolio-stack/auth";
import { writeAuditLog } from "@portfolio-stack/db/audit";
import { env } from "@portfolio-stack/env/server";
import { DEFAULT_STREAM_CUSTOMER, getStreamVideoUrls } from "@portfolio-stack/media";
import { z } from "zod";

import { adminProcedure } from "../index";
import { runAuditedOperation } from "../operations";
import {
  createStreamDirectUpload,
  deleteStreamVideo,
  isDefinitiveStreamRejection,
  STREAM_UID_PATTERN,
  StreamApiError,
  StreamConfigurationError,
} from "../stream/cloudflare";

function allowedStreamOrigins() {
  return streamAllowedOrigins(parseTrustedOrigins(env.CORS_ORIGIN));
}

/** Keep provider details out of the response; the cause stays attached for error tracking. */
function streamFailure(error: unknown, message: string): never {
  if (error instanceof StreamConfigurationError) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: error.message, cause: error });
  }
  if (error instanceof StreamApiError && error.status === 404) {
    throw new ORPCError("NOT_FOUND", { message: "The Stream video does not exist.", cause: error });
  }
  throw new ORPCError("INTERNAL_SERVER_ERROR", { message, cause: error });
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
      let result: Awaited<ReturnType<typeof createStreamDirectUpload>>;
      try {
        result = await createStreamDirectUpload({
          maxDurationSeconds: input?.maxDurationSeconds ?? 3600,
          allowedOrigins: allowedStreamOrigins(),
        });
      } catch (error) {
        streamFailure(error, "Failed to generate Stream upload URL");
      }

      // Creating an upload slot changes nothing durable, so a single record
      // after the fact is enough; unused slots expire on their own.
      await writeAuditLog(context.actor, {
        action: "stream.direct_upload",
        entityType: "stream_video",
        entityId: result.uid,
      });

      return {
        uploadUrl: result.uploadURL,
        uid: result.uid,
        urls: getStreamVideoUrls(result.uid, DEFAULT_STREAM_CUSTOMER),
      };
    }),

  deleteVideo: adminProcedure
    .input(z.object({ uid: z.string().regex(STREAM_UID_PATTERN) }))
    .handler(async ({ context, input }) => {
      try {
        await runAuditedOperation(
          {
            actor: context.actor,
            telemetry: context.telemetry,
            action: "stream.delete",
            entityType: "stream_video",
            entityId: input.uid,
            isDefinitiveFailure: isDefinitiveStreamRejection,
          },
          () => deleteStreamVideo(input.uid),
        );
      } catch (error) {
        if (error instanceof ORPCError) throw error;
        streamFailure(error, "Failed to delete Stream video");
      }

      return { ok: true as const };
    }),
};
