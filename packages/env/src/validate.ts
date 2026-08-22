import { z } from "zod";

/**
 * Configuration the Worker cannot serve a request without.
 *
 * Only string configuration is checked. Bindings are deliberately excluded:
 * Cloudflare runs the module once at upload to verify it starts, and bindings
 * are not attached during that phase, so asserting them rejects a correct
 * deploy with `ScriptStartupError`. A binding that fails to attach is a fault
 * in the stack definition, which the deploy itself already surfaces — unlike
 * secrets and URLs, which vary per environment and are what an operator
 * actually gets wrong.
 *
 * Strength rules live in the deploy preflight, so local development is not
 * held to production's entropy requirements.
 */
const requiredValues = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  CORS_ORIGIN: z.string().min(1),
  ENVIRONMENT: z.enum(["development", "test", "production"]),
});

/** A description of everything wrong with `source`, or `null` when it is usable. */
export function describeEnvFailure(source: Record<string, unknown>): string | null {
  const result = requiredValues.safeParse(source);
  if (result.success) return null;

  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
