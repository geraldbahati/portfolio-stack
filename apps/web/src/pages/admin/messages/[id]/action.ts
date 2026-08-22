import { adminMessageActionSchema } from "@portfolio-stack/api/schemas/admin/message";
import type { APIRoute } from "astro";

import { isSameOriginFormPost } from "../../../../lib/admin/project-form";
import { createServerOrpc } from "../../../../lib/data/orpc";

function actionErrorKey(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "BAD_REQUEST") return "invalid-confirmation";
    if (error.code === "NOT_FOUND") return "not-found";
  }
  return "action-failed";
}

export const POST = (async ({ locals, params, redirect, request }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  if (!isSameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });
  if (!params.id) return redirect("/admin/messages?error=not-found", 303);

  const destination = `/admin/messages/${encodeURIComponent(params.id)}`;
  try {
    const form = await request.formData();
    const action = form.get("action");
    const confirmation = form.get("confirmation");
    const api = createServerOrpc(request.headers.get("cookie"));
    const input = adminMessageActionSchema.parse({
      id: params.id,
      action: typeof action === "string" ? action : "",
      confirmation: typeof confirmation === "string" ? confirmation.trim() : "",
    });
    const result = await api.admin.messages.action(input);

    if (result.deleted) return redirect("/admin/messages?notice=deleted", 303);
    if (input.action === "delete") throw new Error("Delete did not complete");
    const notices = {
      "mark-read": "read",
      "mark-unread": "unread",
      archive: "archived",
      restore: "restored",
    } as const;
    return redirect(`${destination}?notice=${notices[input.action]}`, 303);
  } catch (error) {
    const key = actionErrorKey(error);
    if (key === "not-found") return redirect("/admin/messages?error=not-found", 303);
    return redirect(`${destination}?error=${key}`, 303);
  }
}) satisfies APIRoute;
