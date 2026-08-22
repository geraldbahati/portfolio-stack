import type { APIRoute } from "astro";

import { isSameOriginFormPost, mutationErrorKey } from "../../../../lib/admin/project-form";
import { createServerOrpc } from "../../../../lib/data/orpc";

export const POST = (async ({ locals, params, redirect, request }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  if (!isSameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });
  if (!params.id) return redirect("/admin/projects?error=not-found", 303);

  const destination = `/admin/projects/${encodeURIComponent(params.id)}/edit`;
  try {
    const form = await request.formData();
    const publish = form.get("publish") === "true";
    const confirmation = form.get("confirmation");
    const api = createServerOrpc(request.headers.get("cookie"));
    await api.admin.projects.publication({
      id: params.id,
      publish,
      confirmation: typeof confirmation === "string" ? confirmation.trim() : "",
    });
    return redirect(`${destination}?notice=${publish ? "published" : "unpublished"}`, 303);
  } catch (error) {
    return redirect(`${destination}?error=${mutationErrorKey(error)}`, 303);
  }
}) satisfies APIRoute;
