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

  // Alchemy reports the dev port ready before Vite has finished optimizing
  // dependencies, and the program reloads that follow abort in-flight module
  // and image requests. Load the home page until one complete load reports no
  // upstream failure, so the projects that depend on this setup meet a settled
  // server rather than a restarting one.
  // A single clean load is not proof the server has settled: Vite reloads the
  // program more than once after a cold dependency optimization, so a reload
  // can still land between this warm-up and the first real test. Require two
  // consecutive clean loads before handing over.
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
          // The hero's own h1, matched by level rather than by name: the name
          // is marketing copy, and the point here is only that the page
          // rendered rather than that it still says a particular thing.
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
