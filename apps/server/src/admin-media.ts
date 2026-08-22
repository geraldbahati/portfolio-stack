import { writeAuditLog } from "@portfolio-stack/db/audit";
import { env } from "@portfolio-stack/env/server";
import {
  ADMIN_MEDIA_MAX_BYTES,
  createAdminMediaKey,
  isAdminImageType,
  isAdminMediaFolder,
  isSafeAdminMediaKey,
} from "@portfolio-stack/media/admin";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: privateHeaders });
}

function decodeUploadHeader(request: Request, name: string, maxLength: number) {
  const value = request.headers.get(name);
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded && decoded.length <= maxLength ? decoded : null;
  } catch {
    return null;
  }
}

export async function handleAdminMediaUpload(request: Request, actorEmail: string) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType || !isAdminImageType(contentType)) {
    return jsonError("Choose an AVIF, GIF, JPEG, PNG, or WebP image.", 415);
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (!Number.isSafeInteger(contentLength) || contentLength < 1) {
    return jsonError("A valid Content-Length header is required.", 411);
  }
  if (contentLength > ADMIN_MEDIA_MAX_BYTES) {
    return jsonError("Images must be 25 MiB or smaller.", 413);
  }

  const folder = decodeUploadHeader(request, "x-media-folder", 32);
  const fileName = decodeUploadHeader(request, "x-media-filename", 240);
  const alt = decodeUploadHeader(request, "x-media-alt", 240);
  if (!folder || !isAdminMediaFolder(folder)) return jsonError("Invalid media folder.", 400);
  if (!fileName) return jsonError("A valid filename is required.", 400);
  if (!alt || alt.length < 2) return jsonError("Alt text must be at least 2 characters.", 400);
  if (!request.body) return jsonError("The image body is required.", 400);

  const key = createAdminMediaKey({ folder, fileName, contentType });
  await env.MEDIA.put(key, request.body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      alt,
      originalName: fileName,
    },
  });

  try {
    await writeAuditLog({
      actorEmail,
      action: "media.upload",
      entityType: "media",
      entityId: key,
      metadata: { contentType, size: contentLength },
    });
  } catch (error) {
    await env.MEDIA.delete(key);
    throw error;
  }

  return Response.json({ key }, { status: 201, headers: privateHeaders });
}

export async function handleAdminMediaPreview(key: string) {
  if (!isSafeAdminMediaKey(key)) return jsonError("Invalid media key.", 400);
  const object = await env.MEDIA.get(key);
  if (!object) return jsonError("Media object not found.", 404);

  const headers = new Headers(privateHeaders);
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
