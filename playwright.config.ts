import { defineConfig, devices } from "@playwright/test";

import {
  ADMIN_AUTH_FILE,
  E2E_SEED_SECRET,
  LOCAL_E2E_API_URL,
  LOCAL_E2E_WEB_URL,
} from "./e2e/support";

const externalBaseUrl = process.env.E2E_BASE_URL;
const externalAdminCredentials = Boolean(
  process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD,
);
const runAdminProject = !externalBaseUrl || externalAdminCredentials;

if (!externalBaseUrl) {
  process.env.E2E_API_URL = LOCAL_E2E_API_URL;
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: externalBaseUrl ?? LOCAL_E2E_WEB_URL,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "bun run --cwd packages/infra dev -- --stage e2e",
        url: LOCAL_E2E_WEB_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          BETTER_AUTH_SECRET: "e2e-only-secret-at-least-thirty-two-characters",
          CORS_ORIGIN: LOCAL_E2E_WEB_URL,
          E2E_MODE: "true",
          ENVIRONMENT: "test",
          PUBLIC_TURNSTILE_SITE_KEY: "",
          RESEND_API_KEY: "",
          SEED_ADMIN_SECRET: E2E_SEED_SECRET,
          TURNSTILE_SECRET_KEY: "",
        },
      },
  projects: [
    ...(runAdminProject ? [{ name: "setup", testMatch: /auth\.setup\.ts/ }] : []),
    {
      name: "public-chromium",
      testMatch: /public-site\.spec\.ts/,
      dependencies: runAdminProject ? ["setup"] : [],
      use: { ...devices["Desktop Chrome"] },
    },
    ...(runAdminProject
      ? [
          {
            name: "admin-chromium",
            testMatch: /admin\.spec\.ts/,
            dependencies: ["setup"],
            use: { ...devices["Desktop Chrome"], storageState: ADMIN_AUTH_FILE },
          },
        ]
      : []),
  ],
});
