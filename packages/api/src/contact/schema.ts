import { z } from "zod";

export const CONTACT_EMAIL = "contact@geraldbahati.dev";

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
  privacyConsent: z
    .boolean()
    .refine((value) => value === true, "You must agree to the privacy policy"),
  honeypot: z.string().optional(),
});

export const contactSubmitSchema = contactFormSchema.extend({
  turnstileToken: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type ContactSubmitInput = z.infer<typeof contactSubmitSchema>;

export type ContactSubmitResult = { ok: true; message: string } | { ok: false; error: string };

export function flattenContactErrors(error: z.ZodError) {
  const fieldErrors: Partial<Record<keyof ContactFormValues, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof ContactFormValues] = issue.message;
    }
  }
  return fieldErrors;
}
