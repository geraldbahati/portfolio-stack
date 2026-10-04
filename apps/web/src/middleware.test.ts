import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ PUBLIC_SERVER_URL: "http://localhost:3000" }));
vi.mock("astro:middleware", () => ({ defineMiddleware: (handler: unknown) => handler }));
vi.mock("./lib/seo/site", () => ({ canonicalRedirectFor: () => null }));
const captureException = vi.fn();
vi.mock("./lib/observability/server-telemetry", () => ({
  webTelemetry: () => ({ captureException }),
}));

import { onRequest } from "./middleware";

function contextFor(path: string) {
  const url = new URL(path, "http://localhost:4321");
  return {
    url,
    request: new Request(url, { headers: { "cf-ray": "ray-123" } }),
    locals: {},
    isPrerendered: false,
    routePattern: "/[slug]",
  } as unknown as APIContext;
}

for (const path of ["/", "/projects/example", "/sitemap.xml", "/_astro/image.png"]) {
  describe(`cache headers for ${path}`, () => {
    it("prevents caching server failures even when upstream declares an immutable asset", async () => {
      const context = contextFor(path);
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

describe("request correlation and failures", () => {
  it("exposes the request ID on the response", async () => {
    const response = await onRequest(contextFor("/"), async () => new Response("ok"));
    expect(response?.headers.get("X-Request-Id")).toBe("ray-123");
  });

  it("reports a render failure once and rethrows it for the 500 page", async () => {
    captureException.mockReset();
    const failure = new Error("render failed");
    await expect(
      onRequest(contextFor("/projects/example"), async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(captureException).toHaveBeenCalledWith(failure, {
      operation: "web.render /[slug]",
      handled: false,
      mechanism: "middleware",
    });
  });
});
