import {
  CONTACT_EMAIL,
  type ContactFormValues,
  contactFormSchema,
  flattenContactErrors,
} from "@portfolio-stack/api/contact";

export function readContactForm(form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""),
    email: String(data.get("email") ?? ""),
    message: String(data.get("message") ?? ""),
    privacyConsent: data.get("privacyConsent") === "true",
    honeypot: String(data.get("honeypot") ?? ""),
  };
}

export function validateContactForm(raw: Record<string, unknown>) {
  const parsed = contactFormSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true as const, data: parsed.data };
  }
  return { ok: false as const, errors: flattenContactErrors(parsed.error) };
}

export const FAIL_FALLBACK = `The form could not be sent. Please try again or email ${CONTACT_EMAIL}.`;

export type { ContactFormValues };
