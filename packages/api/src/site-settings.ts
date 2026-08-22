import { z } from "zod";

export const DEFAULT_PUBLIC_SITE_SETTINGS = {
  professionalTitle: "Full-Stack Software Engineer",
  location: "Based in Nairobi, Kenya",
  businessHours: "Mon – Fri: 9:00 - 18:00",
  availability: "Async communication via Email",
  instagramUrl: "https://www.instagram.com/ace._gb/",
  linkedinUrl: "https://www.linkedin.com/in/geraldbahati/",
  xUrl: "https://x.com/gerald_baha",
  whatsappUrl: "https://wa.me/254704713070",
  githubUrl: "https://github.com/geraldbahati",
} as const;

function optionalSocialUrl(hosts: readonly string[]) {
  return z
    .string()
    .trim()
    .max(2048)
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        const hostname = url.hostname.replace(/^www\./, "");
        return url.protocol === "https:" && hosts.some((host) => hostname === host);
      } catch {
        return false;
      }
    }, "Use an HTTPS URL for the expected social network.");
}

export const siteSettingsWriteSchema = z.object({
  professionalTitle: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(100),
  businessHours: z.string().trim().min(2).max(100),
  availability: z.string().trim().min(2).max(120),
  instagramUrl: optionalSocialUrl(["instagram.com"]),
  linkedinUrl: optionalSocialUrl(["linkedin.com"]),
  xUrl: optionalSocialUrl(["x.com", "twitter.com"]),
  whatsappUrl: optionalSocialUrl(["wa.me", "api.whatsapp.com"]),
  githubUrl: optionalSocialUrl(["github.com"]),
});

export type PublicSiteSettings = z.output<typeof siteSettingsWriteSchema>;

export const SOCIAL_SETTING_FIELDS = [
  { key: "instagramUrl", id: "instagram", label: "Instagram" },
  { key: "linkedinUrl", id: "linkedin", label: "LinkedIn" },
  { key: "xUrl", id: "x", label: "X" },
  { key: "whatsappUrl", id: "whatsapp", label: "WhatsApp" },
  { key: "githubUrl", id: "github", label: "GitHub" },
] as const;

export function socialLinksFromSettings(settings: PublicSiteSettings) {
  return SOCIAL_SETTING_FIELDS.flatMap((social) => {
    const href = settings[social.key];
    return href ? [{ id: social.id, href, label: social.label }] : [];
  });
}

export function resolvePublicSiteSettings(value: unknown): PublicSiteSettings {
  const normalized =
    value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value).map(([key, fieldValue]) => [
            key,
            SOCIAL_SETTING_FIELDS.some((social) => social.key === key) && fieldValue === null
              ? ""
              : fieldValue,
          ]),
        )
      : value;
  const parsed = siteSettingsWriteSchema.safeParse(normalized);
  return parsed.success ? parsed.data : siteSettingsWriteSchema.parse(DEFAULT_PUBLIC_SITE_SETTINGS);
}
