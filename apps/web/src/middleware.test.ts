import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ PUBLIC_SERVER_URL: "http://localhost:3000" }));
vi.mock("astro:middleware", () => ({ defineMiddleware: (handler: unknown) => handler }));
vi.mock("./lib/seo/site", () => ({ canonicalRedirectFor: () => null }));

import { onRequest } from "./middleware";

for (const path of ["/", "/projects/example", "/sitemap.xml", "/_astro/image.png"]) {
  describe(`cache headers for ${path}`, () => {
    it("prevents caching server failures even when upstream declares an immutable asset", async () => {
      const context = { url: new URL(path, "http://localhost:4321") } as APIContext;
      const response = await onRequest(
        context,
        async () =>
          new Response("Existing error UI", {
            status: 503,
            headers: {
              "Cache-Control": "public, max-age=31536000, immutable",
              "CDN-Cache-Control": "public, max-age=31536000, immutable",
              "Retry-After": "30",
            },
          }),
      );
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(503);
      expect(response?.headers.get("Cache-Control")).toBe("no-store");
      expect(response?.headers.get("CDN-Cache-Control")).toBe("no-store");
      expect(response?.headers.get("Retry-After")).toBe("30");
      expect(await response?.text()).toBe("Existing error UI");
    });
  });
}
