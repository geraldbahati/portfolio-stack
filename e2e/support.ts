import path from "node:path";

export const LOCAL_E2E_WEB_URL = "http://localhost:4421";
export const LOCAL_E2E_API_URL = "http://localhost:3100";
export const E2E_ADMIN_EMAIL = "e2e-admin@geraldbahati.dev";
export const E2E_ADMIN_PASSWORD = "e2e-admin-password-2026-only";
export const E2E_SEED_SECRET = "e2e-seed-secret-not-for-production";
export const ADMIN_AUTH_FILE = path.join(process.cwd(), "test-results/.auth/admin.json");

export function e2eApiUrl() {
  return process.env.E2E_API_URL ?? LOCAL_E2E_API_URL;
}
