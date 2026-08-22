import { describe, expect, it } from "vitest";

import { ALIAS_HOSTS, canonicalRedirectFor, canonicalUrl, SITE_URL } from "./site";

describe("canonical host", () => {
  it("serves content from the www host", () => {
    expect(SITE_URL).toBe("https://www.geraldbahati.dev");
    expect(canonicalUrl("/")).toBe("https://www.geraldbahati.dev/");
  });

  it("never lists the canonical host as an alias", () => {
    expect(ALIAS_HOSTS).not.toContain(new URL(SITE_URL).hostname);
  });
});

describe("canonicalRedirectFor", () => {
  it("redirects the bare apex to the canonical host", () => {
    expect(canonicalRedirectFor(new URL("https://geraldbahati.dev/"))).toBe(
      "https://www.geraldbahati.dev/",
    );
  });

  it("preserves the path and query of a deep link", () => {
    expect(
      canonicalRedirectFor(new URL("https://geraldbahati.dev/projects/webline-store?ref=cv")),
    ).toBe("https://www.geraldbahati.dev/projects/webline-store?ref=cv");
  });

  it("leaves requests on the canonical host alone", () => {
    expect(canonicalRedirectFor(new URL("https://www.geraldbahati.dev/projects"))).toBeNull();
  });

  it("leaves development and preview hosts alone", () => {
    expect(canonicalRedirectFor(new URL("http://localhost:4321/"))).toBeNull();
    expect(canonicalRedirectFor(new URL("http://localhost:4421/contact"))).toBeNull();
    expect(
      canonicalRedirectFor(new URL("https://portfolio-stack-web-production.workers.dev/")),
    ).toBeNull();
  });
});
