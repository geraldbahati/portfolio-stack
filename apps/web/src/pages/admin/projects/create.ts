import type { APIRoute } from "astro";

import {
  isSameOriginFormPost,
  mutationErrorKey,
  parseAdminProjectForm,
} from "../../../lib/admin/project-form";
import { createServerOrpc } from "../../../lib/data/orpc";

export const POST = (async ({ locals, redirect, request }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  if (!isSameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });

  try {
    const input = parseAdminProjectForm(await request.formData());
    const api = createServerOrpc(request.headers.get("cookie"));
    const created = await api.admin.projects.create(input);
    return redirect(`/admin/projects/${encodeURIComponent(created.id)}/edit?notice=created`, 303);
  } catch (error) {
    return redirect(`/admin/projects/new?error=${mutationErrorKey(error)}`, 303);
  }
}) satisfies APIRoute;
