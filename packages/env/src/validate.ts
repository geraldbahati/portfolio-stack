import { z } from "zod";

const requiredValues = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  CORS_ORIGIN: z.string().min(1),
  ENVIRONMENT: z.enum(["development", "test", "production"]),
});

const requiredBindings = ["DB", "MEDIA", "CONTACT_RATE_LIMIT"] as const;

export function describeEnvFailure(source: Record<string, unknown>): string | null {
  const absentBindings = requiredBindings.filter((key) => !source[key]);
  const result = requiredValues.safeParse(source);

  if (absentBindings.length === 0 && result.success) return null;

  return [
    ...absentBindings.map((key) => `${key}: binding not attached`),
    ...(result.success
      ? []
      : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)),
  ].join("; ");
}
