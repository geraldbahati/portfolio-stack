import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe
  .serial("authenticated admin", () => {
    test("core admin pages render cleanly and meet automated accessibility checks", async ({
      page,
    }) => {
      for (const route of [
        "/admin",
        "/admin/activity",
        "/admin/projects",
        "/admin/messages",
        "/admin/media",
        "/admin/settings",
      ]) {
        const errors: string[] = [];
        const onConsole = (message: { type(): string; text(): string }) => {
          if (message.type() === "error") errors.push(message.text());
        };
        const onPageError = (error: Error) => errors.push(error.message);
        page.on("console", onConsole);
        page.on("pageerror", onPageError);

        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.status()).toBe(200);
        await expect(page.locator("main")).toBeVisible();
        expect(errors).toEqual([]);

        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(scan.violations).toEqual([]);

        page.off("console", onConsole);
        page.off("pageerror", onPageError);
      }
    });

    test("creates, edits, enriches, publishes, and unpublishes a project", async ({ page }) => {
      const suffix = Date.now();
      const slug = `e2e-project-${suffix}`;
      const initialTitle = `E2E Project ${suffix}`;
      const updatedTitle = `${initialTitle} Updated`;

      await page.goto("/admin/projects/new");
      await page.getByLabel(/Project title/).fill(initialTitle);
      await page.getByLabel(/URL slug/).fill(slug);
      await page.getByLabel(/Project summary/).fill("An end-to-end verified portfolio project.");
      await page.getByLabel(/Media type/).selectOption("gif");
      await page
        .getByLabel(/Media source URL/)
        .fill("https://media.geraldbahati.dev/e2e/project.webp");
      await page.getByLabel(/Accessible description/).fill("A test project interface");
      await page.getByLabel("Tagline").fill("Verified from draft to publication");
      await page
        .getByLabel("Full description")
        .fill("This project verifies the complete server-rendered administration workflow.");
      await page.getByLabel("Services").fill("Engineering\nQuality assurance");
      await page.getByRole("button", { name: "Create draft" }).click();

      await page.waitForURL(new RegExp(`/admin/projects/${slug}/edit\\?notice=created$`));
      await expect(page.getByText("Project draft created.", { exact: false })).toBeVisible();

      await page.getByLabel(/Project title/).fill(updatedTitle);
      await page.getByRole("button", { name: "Save project" }).click();
      await expect(page.getByText("Project changes saved.")).toBeVisible();

      await page.getByRole("link", { name: "Case-study content" }).click();
      await page.getByLabel("Metrics").fill("99% | E2E confidence | quality");
      await page.getByRole("button", { name: "Save metrics" }).click();
      await expect(page.getByText("Project metrics updated.")).toBeVisible();

      await page.getByRole("link", { name: "Core details" }).click();
      await page.getByLabel(new RegExp(`Type ${slug} to confirm`)).fill(slug);
      await page.getByRole("button", { name: "Publish project" }).click();
      await expect(page.getByText("Project published successfully.")).toBeVisible();

      const publicResponse = await page.goto(`/projects/${slug}`, {
        waitUntil: "domcontentloaded",
      });
      expect(publicResponse?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: updatedTitle })).toBeVisible();

      await page.goto(`/admin/projects/${slug}/edit`);
      await page.getByLabel(new RegExp(`Type ${slug} to confirm`)).fill(slug);
      await page.getByRole("button", { name: "Unpublish project" }).click();
      await expect(page.getByText("Project unpublished successfully.")).toBeVisible();
    });

    test("moves a real contact submission through the complete inbox lifecycle", async ({
      page,
    }) => {
      const suffix = Date.now();
      const sender = `E2E Sender ${suffix}`;

      await page.goto("/contact");
      await page.locator("#contact-name").fill(sender);
      await page.locator("#contact-email").fill(`e2e-${suffix}@example.com`);
      await page
        .locator("#contact-message")
        .fill("This message verifies the authenticated inbox lifecycle end to end.");
      await page.locator("#contact-privacy").check();
      const submit = page.locator("[data-contact-submit]");
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(page.locator("[data-contact-status]")).toContainText("Thank you");

      await page.goto("/admin/messages");
      await page.getByPlaceholder("Search sender, email, or message").fill(sender);
      await page.getByRole("button", { name: "Apply filters" }).click();
      await page.locator(".admin-message-row", { hasText: sender }).click();
      await expect(page.getByRole("heading", { level: 1, name: sender })).toBeVisible();

      const submissionId = (
        await page.locator(".admin-message-detail__footer code").textContent()
      )?.trim();
      expect(submissionId).toBeTruthy();

      await page.getByRole("button", { name: "Mark as read" }).click();
      await expect(page.getByText("Message marked as read.")).toBeVisible();
      await page.getByRole("button", { name: "Archive message" }).click();
      await expect(page.getByText("Message archived.", { exact: false })).toBeVisible();
      await page.getByRole("button", { name: "Restore to inbox" }).click();
      await expect(page.getByText("Message restored to the inbox.")).toBeVisible();

      await page.getByLabel("Type the exact submission ID to confirm").fill(submissionId ?? "");
      await page.getByRole("button", { name: "Permanently delete" }).click();
      await expect(page.getByText("The contact submission was permanently deleted.")).toBeVisible();

      await page.getByPlaceholder("Search sender, email, or message").fill(sender);
      await page.getByRole("button", { name: "Apply filters" }).click();
      await expect(
        page.getByRole("heading", { name: "No messages match these filters" }),
      ).toBeVisible();
    });

    test("uploads, previews, and permanently deletes an R2 image", async ({ page }) => {
      const suffix = Date.now();
      const alt = `E2E R2 image ${suffix}`;
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nNwAAAAASUVORK5CYII=",
        "base64",
      );

      await page.goto("/admin/media");
      await page.getByLabel(/Image Required/).setInputFiles({
        name: `verified-${suffix}.png`,
        mimeType: "image/png",
        buffer: png,
      });
      await page.getByLabel(/Folder Required/).selectOption("uploads");
      await page.getByLabel(/Alt text Required/).fill(alt);
      await page.getByRole("button", { name: "Upload image" }).click();

      await page.waitForURL("**/admin/media?notice=uploaded");
      await expect(page.getByText("The image was uploaded and is ready to use.")).toBeVisible();
      const card = page.locator(".admin-media-card", { hasText: alt });
      await expect(card).toBeVisible();
      const image = card.getByRole("img", { name: alt });
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
        .toBe(1);

      const key = await card.getAttribute("data-media-key");
      expect(key).toMatch(/^uploads\/\d{4}\/\d{2}\/verified-/);
      const publicUrl = await card.getByLabel("Public URL").inputValue();
      expect(publicUrl).toContain(key ?? "missing-key");

      await card.getByText("Delete asset").click();
      await card.getByLabel("Confirm object key").fill(key ?? "");
      await card.getByRole("button", { name: "Delete permanently" }).click();
      await expect(page.getByText("The media object was permanently deleted.")).toBeVisible();
      await expect(page.locator(".admin-media-card", { hasText: alt })).toHaveCount(0);
    });

    test("validates, publishes, and restores public profile settings", async ({ page }) => {
      const suffix = Date.now();
      const updatedTitle = `E2E Software Engineer ${suffix}`;

      await page.goto("/admin/settings");
      await page.getByLabel("GitHub").fill("https://example.com/not-github");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(
        page.getByText("Review the highlighted requirements", { exact: false }),
      ).toBeVisible();

      await page.getByLabel(/Professional title/).fill(updatedTitle);
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(
        page.getByText("Public profile settings saved.", { exact: false }),
      ).toBeVisible();

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator("footer").getByText(updatedTitle)).toBeVisible();

      await page.goto("/admin/settings");
      await page.getByLabel(/Professional title/).fill("Full-Stack Software Engineer");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(
        page.getByText("Public profile settings saved.", { exact: false }),
      ).toBeVisible();
    });

    test("filters audited settings events and surfaces recent activity on the overview", async ({
      page,
    }) => {
      await page.goto("/admin/activity?category=settings");
      await expect(page.getByRole("heading", { name: "Settings · Update" }).first()).toBeVisible();
      await expect(page.getByText("e2e-admin@geraldbahati.dev").first()).toBeVisible();
      await expect(page.getByText("Fields: professionalTitle").first()).toBeVisible();

      await page.getByPlaceholder("Search action, actor, or entity ID").fill("primary");
      await page.getByRole("button", { name: "Apply filters" }).click();
      await expect(page.locator(".admin-activity-event")).not.toHaveCount(0);
      await expect(page.locator(".admin-activity-event code").first()).toHaveText("primary");

      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "Recent admin activity" })).toBeVisible();
      await expect(page.getByRole("link", { name: "View full history" })).toBeVisible();
      await expect(page.getByText("Settings · Update").first()).toBeVisible();
    });

    test("the mobile inbox does not overflow horizontally", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/messages");
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    });

    test("the mobile media library does not overflow horizontally", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/media");
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    });

    test("the mobile settings form does not overflow horizontally", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/settings");
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    });

    test("the mobile activity history does not overflow horizontally", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/activity");
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    });
  });
