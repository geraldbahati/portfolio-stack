import { describe, expect, it } from "vitest";

import { cacheControlForPath, isPrivatePath, PRIVATE_CACHE_CONTROL } from "./cache";
import { applySecurityHeaders, contentSecurityPolicy } from "./security-headers";

describe("cache", () => {
  it("marks auth and admin surfaces private", () => {
    expect(isPrivatePath("/login")).toBe(true);
    expect(isPrivatePath("/dashboard")).toBe(true);
    expect(isPrivatePath("/admin/projects")).toBe(true);
    expect(isPrivatePath("/")).toBe(false);
    expect(isPrivatePath("/projects/rapid")).toBe(false);
    expect(cacheControlForPath("/login")).toBe(PRIVATE_CACHE_CONTROL);
    expect(cacheControlForPath("/")).toContain("s-maxage=60");
    expect(cacheControlForPath("/projects")).toContain("s-maxage=3600");
    expect(cacheControlForPath("/projects/webline-store")).toContain(
      "stale-while-revalidate=86400",
    );
    expect(cacheControlForPath("/sitemap.xml")).toContain("s-maxage=3600");
    expect(cacheControlForPath("/hero.webp")).toContain("max-age=31536000");
    expect(cacheControlForPath("/_astro/hero.hash.avif")).toContain("immutable");
  });
});

describe("security headers", () => {
  it("sets a strict CSP and HSTS only in production", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, false);
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(contentSecurityPolicy(true)).not.toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy(true)).toContain("unsafe-eval");
    expect(contentSecurityPolicy(false, ["http://localhost:3000"])).toContain(
      "http://localhost:3000",
    );
    expect(contentSecurityPolicy(false)).toContain("https://challenges.cloudflare.com");
  });
});
