import type { APIContext } from "astro";
import { afterEach, describe, expect, it, vi } from "vitest";

const { loadPublishedProjects } = vi.hoisted(() => ({ loadPublishedProjects: vi.fn() }));
vi.mock("./projects", () => ({ loadPublishedProjects }));
vi.mock("../observability/server-telemetry", () => ({ captureWebException: vi.fn() }));
vi.mock("../seo/sitemap", () => ({ renderSitemap: () => "<urlset />" }));
vi.mock("../seo/llms-txt", () => ({ renderLlmsTxt: () => "Project list" }));

import { GET as llms } from "../../pages/llms.txt";
import { GET as sitemap } from "../../pages/sitemap.xml";
import { PublicDataUnavailableError } from "./public-request";

afterEach(() => vi.resetAllMocks());

for (const [name, endpoint] of [
  ["sitemap", sitemap],
  ["llms", llms],
] as const) {
  describe(name, () => {
    it("does not publish an empty index during an outage", async () => {
      loadPublishedProjects.mockRejectedValue(
        new PublicDataUnavailableError("projects", new Error("offline")),
      );
      const response = await endpoint({} as APIContext);
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
      expect(response.headers.get("Retry-After")).toBe("30");
    });
    it("still renders a successful empty collection", async () => {
      loadPublishedProjects.mockResolvedValue([]);
      expect((await endpoint({} as APIContext)).status).toBe(200);
    });
  });
}
