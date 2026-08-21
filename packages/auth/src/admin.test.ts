import { describe, expect, it } from "vitest";

import { isAdminEnabled, isAllowedAdminEmail } from "./admin";
import { cookieAttributes, parseTrustedOrigins, streamAllowedOrigins } from "./origins";

describe("admin allowlist", () => {
  it("matches the two known addresses, case-insensitively", () => {
    expect(isAllowedAdminEmail("journeytoharvard@gmail.com")).toBe(true);
    expect(isAllowedAdminEmail("  BahatiGerald0@gmail.com ")).toBe(true);
    expect(isAllowedAdminEmail("stranger@example.com")).toBe(false);
    expect(isAllowedAdminEmail(null)).toBe(false);
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

  it("uses lax cookies on local http and none+secure otherwise", () => {
    expect(cookieAttributes("development", "http://localhost:3000")).toEqual({
      sameSite: "lax",
      secure: false,
      httpOnly: true,
    });
    expect(cookieAttributes("production", "https://api.geraldbahati.dev")).toEqual({
      sameSite: "none",
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
