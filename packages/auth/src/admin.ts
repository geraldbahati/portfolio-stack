/**
 * The only accounts permitted to reach admin procedures.
 *
 * Hardcoded rather than an environment variable: changing who can mutate
 * content should require a reviewed commit. Same addresses as the previous
 * Clerk allowlist.
 */
export const ADMIN_EMAILS = ["journeytoharvard@gmail.com", "bahatigerald0@gmail.com"] as const;

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((allowed) => allowed === normalized);
}

export function isAdminEnabled(value: unknown): boolean {
  return value === true || value === "true";
}
