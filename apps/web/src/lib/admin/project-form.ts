import { adminProjectWriteSchema } from "@portfolio-stack/api/schemas/admin/project";

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(form: FormData, key: string) {
  return text(form, key) || null;
}

function list(form: FormData, key: string) {
  return text(form, key)
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function nullableInteger(form: FormData, key: string) {
  const value = text(form, key);
  if (!value) return null;
  return Number.parseInt(value, 10);
}

export function parseAdminProjectForm(form: FormData, idOverride?: string) {
  const badges = list(form, "badges").map((badge, index) => ({
    text: badge,
    position: index % 2 === 0 ? ("bottom-left" as const) : ("bottom-right" as const),
  }));

  return adminProjectWriteSchema.parse({
    id: idOverride ?? text(form, "id"),
    title: text(form, "title"),
    description: nullableText(form, "description"),
    src: text(form, "src"),
    type: text(form, "type"),
    poster: nullableText(form, "poster"),
    alt: nullableText(form, "alt"),
    url: nullableText(form, "url"),
    badges,
    aspectRatio: nullableText(form, "aspectRatio"),
    sortOrder: Number.parseInt(text(form, "sortOrder"), 10),
    details: {
      tagline: nullableText(form, "tagline"),
      fullDescription: nullableText(form, "fullDescription"),
      services: list(form, "services"),
      client: nullableText(form, "client"),
      industry: nullableText(form, "industry"),
      period: nullableText(form, "period"),
      year: nullableInteger(form, "year"),
      features: list(form, "features"),
    },
  });
}

export function isSameOriginFormPost(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function mutationErrorKey(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = error.code;
    if (code === "CONFLICT") return "duplicate";
    if (code === "BAD_REQUEST") return "not-ready";
  }
  if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
    return "invalid";
  }
  return "save-failed";
}
