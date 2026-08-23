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

  // Alchemy reports the port ready before Vite has compiled the module graph.
  // Vite reloads the program whenever it meets a module it has not transformed
  // yet, and a reload aborts every request in flight — which is what produced
  // the intermittent 502s and "failed to fetch dynamically imported module"
  // errors. Walking each route here forces that compilation to happen before
  // the browser projects start, so nothing is left to discover mid-suite.
  const routesToWarm = [
    "/",
    "/projects",
    "/contact",
    "/privacy",
    "/imprint",
    "/definitely-not-a-real-route",
  ];

  let consecutiveCleanPasses = 0;
  await expect
    .poll(
      async () => {
        const upstreamFailures: string[] = [];
        const recordFailure = (response: Response) => {
          if (response.status() >= 500) upstreamFailures.push(response.url());
        };

        page.on("response", recordFailure);
        try {
          for (const route of routesToWarm) {
            await page.goto(route, { waitUntil: "load" });
            // Matched by level, not name: the copy is marketing text and this
            // only needs to know the page rendered.
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          }
        } finally {
          page.off("response", recordFailure);
        }

        // One clean sweep can still be followed by a reload, so require two.
        consecutiveCleanPasses = upstreamFailures.length === 0 ? consecutiveCleanPasses + 1 : 0;
        return consecutiveCleanPasses;
      },
      {
        message: "the local dev server should settle before the browser projects run",
        timeout: 120_000,
      },
    )
    .toBeGreaterThanOrEqual(2);
});
