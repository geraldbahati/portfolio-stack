import { siteSettingsWriteSchema } from "@portfolio-stack/api/site-settings";
import type { APIRoute } from "astro";

import { isSameOriginFormPost } from "../../../lib/admin/project-form";
import { createServerOrpc } from "../../../lib/data/orpc";

const fieldNames = [
  "professionalTitle",
  "location",
  "businessHours",
  "availability",
  "instagramUrl",
  "linkedinUrl",
  "xUrl",
  "whatsappUrl",
  "githubUrl",
] as const;

export const POST = (async ({ locals, redirect, request }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  if (!isSameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });

  try {
    const form = await request.formData();
    const raw = Object.fromEntries(
      fieldNames.map((field) => {
        const value = form.get(field);
        return [field, typeof value === "string" ? value : ""];
      }),
    );
    const input = siteSettingsWriteSchema.parse(raw);
    const api = createServerOrpc(request.headers.get("cookie"));
    const result = await api.admin.settings.update(input);
    return redirect(
      `/admin/settings?notice=${result.changedFields.length > 0 ? "saved" : "no-changes"}`,
      303,
    );
  } catch {
    return redirect("/admin/settings?error=invalid-settings", 303);
  }
}) satisfies APIRoute;
