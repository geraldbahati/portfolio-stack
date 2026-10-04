import type { AuditActor, AuditEntry } from "@portfolio-stack/db/audit";
import { isAPIError } from "better-auth/api";

const SIGN_IN_PATH = "/sign-in/email";
const MAX_EMAIL_LENGTH = 254;

export type SignInAttempt = {
  path: string;
  /** The endpoint's result: a response on success, an APIError on failure. */
  returned: unknown;
  newSession: { user: { id: string; email: string } } | null | undefined;
  body: unknown;
  headers: Headers | undefined;
};

function attemptedEmail(body: unknown) {
  const email = (body as { email?: unknown } | null)?.email;
  if (typeof email !== "string") return "unknown";
  return email.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH) || "unknown";
}

function failureReason(statusCode: number) {
  if (statusCode === 429) return "rate_limited";
  if (statusCode === 401) return "invalid_credentials";
  if (statusCode === 403) return "forbidden";
  return "error";
}

/**
 * Describe a sign-in attempt as an audit record. Success is attributed to the
 * authenticated user; a failure records the attempted address and a reason
 * category, never the password or the provider's message.
 */
export function signInAuditRecord(
  attempt: SignInAttempt,
): { actor: AuditActor; entry: AuditEntry } | null {
  if (attempt.path !== SIGN_IN_PATH) return null;

  const requestId = attempt.headers?.get("cf-ray") ?? null;

  if (isAPIError(attempt.returned)) {
    return {
      actor: { id: null, email: attemptedEmail(attempt.body), requestId },
      entry: {
        action: "auth.sign_in",
        entityType: "session",
        outcome: "failed",
        metadata: { reason: failureReason(attempt.returned.statusCode) },
      },
    };
  }

  const user = attempt.newSession?.user;
  if (!user) return null;
  return {
    actor: { id: user.id, email: user.email, requestId },
    entry: { action: "auth.sign_in", entityType: "session", entityId: user.id },
  };
}
