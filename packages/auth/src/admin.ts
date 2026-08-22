/**
 * The only accounts permitted to reach admin procedures.
 *
 * Hardcoded rather than an environment variable: changing who can mutate
 * content should require a reviewed commit. Narrowed to the single role
 * address on the portfolio's own domain; the two personal Gmail addresses
 * carried over from the Clerk allowlist no longer have admin access.
 */
export const ADMIN_EMAILS = ["hello@geraldbahati.dev"] as const;
export const E2E_ADMIN_EMAIL = "e2e-admin@geraldbahati.dev";

export function isAllowedAdminEmail(
  email: string | null | undefined,
  environment?: string,
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    ADMIN_EMAILS.some((allowed) => allowed === normalized) ||
    (environment === "test" && normalized === E2E_ADMIN_EMAIL)
  );
}

export function isAdminEnabled(value: unknown): boolean {
  return value === true || value === "true";
}
