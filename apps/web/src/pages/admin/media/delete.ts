import { adminMediaDeleteSchema } from "@portfolio-stack/api/schemas/admin/media";
import type { APIRoute } from "astro";

import { isSameOriginFormPost } from "../../../lib/admin/project-form";
import { createServerOrpc } from "../../../lib/data/orpc";

function errorKey(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "BAD_REQUEST") return "invalid-confirmation";
    if (error.code === "NOT_FOUND") return "not-found";
  }
  return "delete-failed";
}

export const POST = (async ({ locals, redirect, request }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  if (!isSameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });

  try {
    const form = await request.formData();
    const key = form.get("key");
    const confirmation = form.get("confirmation");
    const input = adminMediaDeleteSchema.parse({
      key: typeof key === "string" ? key : "",
      confirmation: typeof confirmation === "string" ? confirmation.trim() : "",
    });
    const api = createServerOrpc(request.headers.get("cookie"));
    await api.admin.media.delete(input);
    return redirect("/admin/media?notice=deleted", 303);
  } catch (error) {
    return redirect(`/admin/media?error=${errorKey(error)}`, 303);
  }
}) satisfies APIRoute;
