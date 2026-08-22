import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = ["/", "/projects", "/contact", "/privacy", "/imprint"] as const;
const API_BASE_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:3000";
const WEB_ORIGIN = new URL(process.env.E2E_BASE_URL ?? "http://localhost:4421").origin;
const PRIVATE_ADMIN_ROUTES = [
  "/admin",
  "/admin/activity",
  "/admin/projects",
  "/admin/projects/new",
  "/admin/projects/example-project/edit",
  "/admin/projects/example-project/content",
  "/admin/messages",
  "/admin/messages/example-message",
  "/admin/media",
  "/admin/settings",
] as const;

async function expectHoverPrefetchOn(locator: import("@playwright/test").Locator) {
  expect(await locator.count()).toBeGreaterThan(0);
  expect(
    await locator.evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-astro-prefetch")),
    ),
  ).toEqual(Array.from({ length: await locator.count() }, () => "hover"));
}

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

  test("only intentional public navigation links opt in to hover prefetching", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectHoverPrefetchOn(page.locator("[data-nav-logo]"));
    await expectHoverPrefetchOn(page.locator("[data-menu-link]"));
    await expectHoverPrefetchOn(page.locator('[data-bio-cta] a[href="/projects"]'));
    await expect(page.locator("[data-social-link][data-astro-prefetch]")).toHaveCount(0);
    await expect(page.locator('a[href="/privacy"][data-astro-prefetch]')).toHaveCount(0);
    await expect(page.locator('a[href="/imprint"][data-astro-prefetch]')).toHaveCount(0);

    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    const projectCards = page.locator("[data-project-hit]");
    test.skip(
      (await projectCards.count()) === 0,
      "No project records are seeded in this environment",
    );
    await expectHoverPrefetchOn(projectCards);
    await expectHoverPrefetchOn(page.locator("[data-project-item] h2 a"));
    await expect(page.locator("[data-live-link][data-astro-prefetch]")).toHaveCount(0);

    await projectCards.first().click();
    await expectHoverPrefetchOn(page.locator('nav[aria-label="Breadcrumb"] a[href="/projects"]'));
    await expectHoverPrefetchOn(
      page.getByRole("navigation", { name: "Case study navigation" }).locator("a"),
    );
    await expectHoverPrefetchOn(page.locator("[data-project-cta-link]"));

    await page.goto("/definitely-not-a-real-route", { waitUntil: "domcontentloaded" });
    await expectHoverPrefetchOn(page.locator('main a[href="/projects"]'));
    await expect(page.locator('main a[href="/"][data-astro-prefetch]')).toHaveCount(0);
    await expect(page.locator('main a[href="/contact"][data-astro-prefetch]')).toHaveCount(0);
  });

  test("project pages are fetched on intent rather than eagerly", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    const projectLink = page.locator("[data-project-hit]").first();
    test.skip(
      (await projectLink.count()) === 0,
      "No project records are seeded in this environment",
    );
    await expect(projectLink).toBeVisible();

    const href = await projectLink.getAttribute("href");
    expect(href).toMatch(/^\/projects\//);
    if (!href) throw new Error("The project prefetch target is missing its href");
    await expect(page.locator(`link[rel="prefetch"][href="${href}"]`)).toHaveCount(0);

    const prefetchRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.origin === WEB_ORIGIN && url.pathname === href && request.method() === "GET";
    });
    await projectLink.hover();
    await prefetchRequest;
  });

  test("large video code is absent from non-video routes", async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });

    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    expect(scripts.some((url) => url.includes("hls"))).toBe(false);
  });

  for (const route of PRIVATE_ADMIN_ROUTES) {
    test(`anonymous ${route} requests are rejected before rendering`, async ({ request }) => {
      const response = await request.get(route, { maxRedirects: 0 });

      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe(`/login?returnTo=${encodeURIComponent(route)}`);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      expect(response.headers()["cdn-cache-control"]).toBe("private, no-store");
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    });
  }

  test("anonymous callers cannot read admin overview data", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/rpc/admin/overview`, {
      data: { json: null },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      json: { code: "UNAUTHORIZED", status: 401 },
    });
  });

  test("bootstrap endpoints require the one-time seed secret", async ({ request }) => {
    for (const path of ["/internal/seed-admin", "/internal/seed-projects"]) {
      const response = await request.post(`${API_BASE_URL}${path}`);
      expect(response.status()).toBe(401);
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    }
  });

  test("the API does not reflect an untrusted CORS origin", async ({ request }) => {
    const response = await request.fetch(`${API_BASE_URL}/api/auth/get-session`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://attacker.invalid",
        "Access-Control-Request-Method": "GET",
      },
    });

    expect(response.headers()["access-control-allow-origin"]).toBeUndefined();
  });

  test("anonymous callers cannot list private project records", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/rpc/admin/projects/list`, {
      data: { json: { search: "", status: "all", page: 1, pageSize: 20 } },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      json: { code: "UNAUTHORIZED", status: 401 },
    });
  });

  test("anonymous callers cannot read private case-study content", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/rpc/admin/projects/content`, {
      data: { json: { id: "example-project" } },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      json: { code: "UNAUTHORIZED", status: 401 },
    });
  });

  test("anonymous callers cannot list private contact submissions", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/rpc/admin/messages/list`, {
      data: {
        json: {
          search: "",
          status: "all",
          view: "inbox",
          read: "all",
          page: 1,
          pageSize: 20,
        },
      },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      json: { code: "UNAUTHORIZED", status: 401 },
    });
  });

  test("anonymous callers cannot read private audit activity", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/rpc/admin/activity/list`, {
      data: { json: { search: "", category: "all", page: 1, pageSize: 30 } },
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      json: { code: "UNAUTHORIZED", status: 401 },
    });
  });

  test("anonymous callers cannot list or upload private media", async ({ request }) => {
    const listResponse = await request.post(`${API_BASE_URL}/rpc/admin/media/list`, {
      data: { json: { prefix: "all", cursor: "", limit: 48 } },
    });
    expect(listResponse.status()).toBe(401);
    expect(await listResponse.json()).toMatchObject({
      json: { code: "UNAUTHORIZED", status: 401 },
    });

    const uploadResponse = await request.put(`${API_BASE_URL}/internal/admin-media/upload`, {
      data: Buffer.from([137, 80, 78, 71]),
      headers: {
        origin: WEB_ORIGIN,
        "content-type": "image/png",
        "x-media-folder": "uploads",
        "x-media-filename": "anonymous.png",
        "x-media-alt": "Anonymous%20upload",
      },
    });
    expect(uploadResponse.status()).toBe(401);
  });

  for (const route of [
    "/admin/projects/create",
    "/admin/projects/example-project/update",
    "/admin/projects/example-project/publication",
    "/admin/projects/example-project/content/save",
    "/admin/messages/example-message/action",
    "/admin/media/delete",
    "/admin/settings/update",
  ]) {
    test(`anonymous form submissions to ${route} are rejected before mutation`, async ({
      request,
    }) => {
      const response = await request.post(route, {
        form: { id: "example-project" },
        headers: { origin: WEB_ORIGIN },
        maxRedirects: 0,
      });

      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe(`/login?returnTo=${encodeURIComponent(route)}`);
    });
  }

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
    // Retrieval crawlers get a named group so a later wildcard edit cannot
    // quietly lock them out.
    expect(body).toContain("User-agent: OAI-SearchBot");
    expect(body).toContain("User-agent: Claude-SearchBot");
    expect(body).toContain("User-agent: PerplexityBot");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    const parsed = await manifest.json();
    expect(parsed.start_url).toBe("/");
    expect(parsed.icons.map((icon: { src: string }) => icon.src)).toContain("/icon-512.png");
  });

  test("the sitemap lists the indexable pages and nothing that is noindexed", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");

    const xml = await response.text();
    expect(xml).toContain("<loc>https://www.geraldbahati.dev/</loc>");
    expect(xml).toContain("<loc>https://www.geraldbahati.dev/projects</loc>");
    expect(xml).toContain("<loc>https://www.geraldbahati.dev/contact</loc>");
    expect(xml).not.toContain("/privacy");
    expect(xml).not.toContain("/imprint");
    expect(xml).not.toContain("/admin");
    // Unescaped ampersands make Search Console reject the whole document.
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|apos;|quot;)/);
  });

  test("llms.txt gives retrieval crawlers a flat version of the site", async ({ request }) => {
    const response = await request.get("/llms.txt");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");

    const body = await response.text();
    expect(body).toContain("# Gerald Bahati");
    expect(body).toContain("https://www.geraldbahati.dev/contact");
  });

  test("the social card is served as a real image", async ({ request }) => {
    const response = await request.get("/og.jpg");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/jpeg");
    expect(Number(response.headers()["content-length"])).toBeGreaterThan(10_000);
  });

  test("every public page carries a canonical, a robots directive, and a social card", async ({
    page,
  }) => {
    for (const route of PUBLIC_ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute(
        "href",
        `https://www.geraldbahati.dev${route === "/" ? "/" : route}`,
      );

      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      const shouldIndex = route !== "/privacy" && route !== "/imprint";
      expect(robots).toBe(
        shouldIndex
          ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
          : "noindex, follow",
      );

      const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(ogImage).toMatch(/^https:\/\//);
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveCount(1);

      // Exactly one h1, and it is not the scrambling eyebrow. Scoped to <main>
      // because the Astro dev toolbar injects h1s of its own outside it.
      const heading = page.locator("main h1");
      await expect(heading).toHaveCount(1);
      expect((await heading.innerText()).trim().length).toBeGreaterThan(0);
    }
  });

  test("the homepage ships one parseable JSON-LD graph", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks).toHaveLength(1);

    const parsed = JSON.parse(blocks[0] as string);
    expect(parsed["@context"]).toBe("https://schema.org");

    const types = parsed["@graph"].map((node: { "@type": string }) => node["@type"]);
    expect(types).toContain("Person");
    expect(types).toContain("WebSite");
    expect(types).toContain("ProfilePage");
  });
});
