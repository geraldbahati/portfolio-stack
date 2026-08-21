import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = ["/", "/projects", "/contact", "/privacy", "/imprint"] as const;

test.describe("public portfolio", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders without browser errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
      expect(errors).toEqual([]);
    });

    test(`${route} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(scan.violations).toEqual([]);
    });
  }

  test("keyboard users can reach the main content", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeFocused();
    await skipLink.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
  });

  test("mobile pages do not overflow horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));

      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    }
  });

  test("the site honors reduced-motion preferences", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
      true,
    );
  });

  test("a project case study includes navigation and the final CTA", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    const firstProject = page.locator('a[href^="/projects/"]').first();

    test.skip(
      (await firstProject.count()) === 0,
      "No project records are seeded in this environment",
    );
    await firstProject.click();

    await expect(page.locator("[data-project-detail]")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Case study navigation" })).toBeVisible();
    await expect(page.locator("[data-project-cta]")).toBeVisible();
  });

  test("large video code is absent from non-video routes", async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });

    await page.goto("/contact", { waitUntil: "networkidle" });
    expect(scripts.some((url) => url.includes("hls"))).toBe(false);
  });

  test("anonymous admin requests are rejected before rendering", async ({ request }) => {
    const response = await request.get("/admin", { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    expect(response.headers().location).toMatch(/^\/login\?returnTo=/);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("the custom not-found page preserves HTTP semantics", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-real-route", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  });

  test("crawl metadata exposes public routes and excludes private surfaces", async ({
    request,
  }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(robots.headers()["content-type"]).toContain("text/plain");
    const body = await robots.text();
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Sitemap: https://www.geraldbahati.dev/sitemap.xml");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    expect((await manifest.json()).start_url).toBe("/");
  });
});
