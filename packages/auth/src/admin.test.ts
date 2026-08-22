import { describe, expect, it } from "vitest";

import { E2E_ADMIN_EMAIL, isAdminEnabled, isAllowedAdminEmail } from "./admin";
import { cookieAttributes, parseTrustedOrigins, streamAllowedOrigins } from "./origins";

describe("admin allowlist", () => {
  it("matches the two known addresses, case-insensitively", () => {
    expect(isAllowedAdminEmail("hello@geraldbahati.dev")).toBe(true);
    expect(isAllowedAdminEmail("  Hello@GeraldBahati.dev ")).toBe(true);
    expect(isAllowedAdminEmail("stranger@example.com")).toBe(false);
    // Removed from the allowlist; kept as explicit regressions.
    expect(isAllowedAdminEmail("journeytoharvard@gmail.com")).toBe(false);
    expect(isAllowedAdminEmail("bahatigerald0@gmail.com")).toBe(false);
    expect(isAllowedAdminEmail(null)).toBe(false);
  });

  it("permits the automation account only in the test environment", () => {
    expect(isAllowedAdminEmail(E2E_ADMIN_EMAIL, "test")).toBe(true);
    expect(isAllowedAdminEmail(E2E_ADMIN_EMAIL, "development")).toBe(false);
    expect(isAllowedAdminEmail(E2E_ADMIN_EMAIL, "production")).toBe(false);
  });

  it("treats only true/'true' as enabled", () => {
    expect(isAdminEnabled(true)).toBe(true);
    expect(isAdminEnabled("true")).toBe(true);
    expect(isAdminEnabled("false")).toBe(false);
    expect(isAdminEnabled("")).toBe(false);
  });
});

describe("origins", () => {
  it("parses a comma-separated CORS_ORIGIN list", () => {
    expect(
      parseTrustedOrigins(
        "http://localhost:4321, https://geraldbahati.dev,https://geraldbahati.dev",
      ),
    ).toEqual(["http://localhost:4321", "https://geraldbahati.dev"]);
  });

  it("uses same-site cookies locally and securely across production subdomains", () => {
    expect(cookieAttributes("development", "http://localhost:3000")).toEqual({
      sameSite: "lax",
      secure: false,
      httpOnly: true,
    });
    expect(cookieAttributes("production", "https://portfolio-api.geraldbahati.dev")).toEqual({
      sameSite: "lax",
      secure: true,
      httpOnly: true,
    });
  });

  it("adds trusted origin hosts to Stream allowlist", () => {
    const hosts = streamAllowedOrigins(["https://preview.example.workers.dev"]);
    expect(hosts).toContain("preview.example.workers.dev");
    expect(hosts).toContain("geraldbahati.dev");
    expect(hosts).toContain("localhost:4321");
  });
});
