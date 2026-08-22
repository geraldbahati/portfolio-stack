import type { APIRoute } from "astro";

import {
  formString,
  parseChallengesText,
  parseGalleryText,
  parseMetricsText,
  parsePresentationForm,
  parseTestimonialForm,
} from "../../../../../lib/admin/case-study-form";
import { isSameOriginFormPost, mutationErrorKey } from "../../../../../lib/admin/project-form";
import { createServerOrpc } from "../../../../../lib/data/orpc";

const SECTIONS = new Set(["metrics", "challenges", "gallery", "testimonial", "presentation"]);

export const POST = (async ({ locals, params, redirect, request }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  if (!isSameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });
  if (!params.id) return redirect("/admin/projects?error=not-found", 303);

  const destination = `/admin/projects/${encodeURIComponent(params.id)}/content`;
  try {
    const form = await request.formData();
    const section = formString(form, "section");
    if (!SECTIONS.has(section)) return new Response("Invalid section", { status: 400 });

    const api = createServerOrpc(request.headers.get("cookie"));
    if (section === "metrics") {
      await api.admin.projects.replaceMetrics({
        id: params.id,
        items: parseMetricsText(formString(form, "content")),
        confirmation: formString(form, "confirmation"),
      });
    } else if (section === "challenges") {
      await api.admin.projects.replaceChallenges({
        id: params.id,
        items: parseChallengesText(formString(form, "content")),
        confirmation: formString(form, "confirmation"),
      });
    } else if (section === "gallery") {
      await api.admin.projects.replaceGallery({
        id: params.id,
        items: parseGalleryText(formString(form, "content")),
        confirmation: formString(form, "confirmation"),
      });
    } else if (section === "testimonial") {
      const remove = formString(form, "intent") === "remove";
      await api.admin.projects.saveTestimonial({
        id: params.id,
        testimonial: remove ? null : parseTestimonialForm(form),
        confirmation: formString(form, "confirmation"),
      });
      return redirect(
        `${destination}?notice=${remove ? "testimonial-removed" : "testimonial"}`,
        303,
      );
    } else {
      const presentation = parsePresentationForm(form);
      await api.admin.projects.savePresentation({ id: params.id, ...presentation });
    }
    return redirect(`${destination}?notice=${section}`, 303);
  } catch (error) {
    return redirect(`${destination}?error=${mutationErrorKey(error)}`, 303);
  }
}) satisfies APIRoute;
