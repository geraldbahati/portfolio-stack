import {
  adminChallengeSchema,
  adminGalleryItemSchema,
  adminMetricSchema,
  adminPresentationSchema,
  adminTestimonialSchema,
} from "@portfolio-stack/api/schemas/admin/project";

function formText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const nullable = (value: string) => value.trim() || null;

export function parseMetricsText(value: string) {
  const items = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [metricValue = "", label = "", icon = ""] = line.split("|").map((part) => part.trim());
      return { value: metricValue, label, icon: nullable(icon) };
    });
  return adminMetricSchema.array().max(20).parse(items);
}

export function formatMetricsText(
  items: Array<{ value: string; label: string; icon: string | null }>,
) {
  return items
    .map((item) => [item.value, item.label, item.icon].filter(Boolean).join(" | "))
    .join("\n");
}

export function parseChallengesText(value: string) {
  const items = value
    .split(/\r?\n\s*---+\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [title = "", ...content] = block.split(/\r?\n/);
      return { title: title.trim(), content: content.join("\n").trim() };
    });
  return adminChallengeSchema.array().max(20).parse(items);
}

export function formatChallengesText(items: Array<{ title: string; content: string }>) {
  return items.map((item) => `${item.title}\n${item.content}`).join("\n---\n");
}

export function parseGalleryText(value: string) {
  const items = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [
        src = "",
        galleryType = "",
        deviceType = "",
        width = "",
        height = "",
        alt = "",
        ...caption
      ] = line.split("|").map((part) => part.trim());
      return {
        src,
        galleryType,
        deviceType: nullable(deviceType),
        width: Number.parseInt(width, 10),
        height: Number.parseInt(height, 10),
        alt: nullable(alt),
        caption: nullable(caption.join(" | ")),
      };
    });
  return adminGalleryItemSchema.array().max(40).parse(items);
}

export function formatGalleryText(
  items: Array<{
    src: string;
    galleryType: "feature" | "stack";
    deviceType: "desktop" | "mobile" | "tablet" | "full-width" | null;
    width: number;
    height: number;
    alt: string | null;
    caption: string | null;
  }>,
) {
  return items
    .map((item) =>
      [
        item.src,
        item.galleryType,
        item.deviceType ?? "",
        item.width,
        item.height,
        item.alt ?? "",
        item.caption ?? "",
      ].join(" | "),
    )
    .join("\n");
}

export function parsePresentationForm(form: FormData) {
  const colorPalette = formText(form, "colors")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hex = "", name = ""] = line.split("|").map((part) => part.trim());
      return { hex, ...(name ? { name } : {}) };
    });
  const relatedProjectIds = form
    .getAll("relatedProjectIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return adminPresentationSchema.parse({ colorPalette, relatedProjectIds });
}

export function formatColorsText(items: Array<{ hex: string; name?: string }>) {
  return items.map((item) => [item.hex, item.name].filter(Boolean).join(" | ")).join("\n");
}

export function parseTestimonialForm(form: FormData) {
  return adminTestimonialSchema.parse({
    quote: formText(form, "quote"),
    authorName: formText(form, "authorName"),
    authorRole: nullable(formText(form, "authorRole")),
    authorCompany: nullable(formText(form, "authorCompany")),
    authorImage: nullable(formText(form, "authorImage")),
  });
}

export function formString(form: FormData, key: string) {
  return formText(form, key);
}
