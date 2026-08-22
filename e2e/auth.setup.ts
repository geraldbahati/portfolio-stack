import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, type Response, test as setup } from "@playwright/test";

import {
  ADMIN_AUTH_FILE,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_SEED_SECRET,
  e2eApiUrl,
} from "./support";

setup("authenticate the isolated admin account", async ({ page, request }) => {
  const external = Boolean(process.env.E2E_BASE_URL);
  const email = process.env.E2E_ADMIN_EMAIL ?? (external ? "" : E2E_ADMIN_EMAIL);
  const password = process.env.E2E_ADMIN_PASSWORD ?? (external ? "" : E2E_ADMIN_PASSWORD);

  if (!email || !password) {
    throw new Error(
      "Authenticated external checks require E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.",
    );
  }

  if (!external) {
    const seedHeaders = { "x-seed-secret": E2E_SEED_SECRET };
    const adminSeed = await request.post(`${e2eApiUrl()}/internal/seed-admin`, {
      headers: seedHeaders,
      data: { email, password, name: "E2E Admin" },
    });
    expect([200, 201]).toContain(adminSeed.status());

    const projectSeed = await request.post(`${e2eApiUrl()}/internal/seed-projects`, {
      headers: seedHeaders,
    });
    expect(projectSeed.status()).toBe(200);
  }

  await page.goto("/login?returnTo=%2Fadmin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();

  await mkdir(path.dirname(ADMIN_AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: ADMIN_AUTH_FILE });

  // Alchemy reports the port ready before Vite finishes optimizing dependencies,
  // and the reloads that follow abort in-flight requests. Vite reloads more than
  // once on a cold cache, so one clean load is not proof it has settled.
  let consecutiveCleanLoads = 0;
  await expect
    .poll(
      async () => {
        const upstreamFailures: string[] = [];
        const recordFailure = (response: Response) => {
          if (response.status() >= 500) upstreamFailures.push(response.url());
        };

        page.on("response", recordFailure);
        try {
          await page.goto("/", { waitUntil: "load" });
          // Matched by level, not name: the heading text is marketing copy and
          // this only needs to know the page rendered.
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        } finally {
          page.off("response", recordFailure);
        }

        consecutiveCleanLoads = upstreamFailures.length === 0 ? consecutiveCleanLoads + 1 : 0;
        return consecutiveCleanLoads;
      },
      {
        message: "the local dev server should settle before the browser projects run",
        timeout: 60_000,
      },
    )
    .toBeGreaterThanOrEqual(2);
});
