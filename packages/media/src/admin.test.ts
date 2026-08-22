import { describe, expect, it } from "vitest";

import {
  ADMIN_MEDIA_MAX_BYTES,
  createAdminMediaKey,
  isAdminImageType,
  isAdminMediaFolder,
  isSafeAdminMediaKey,
  publicMediaUrl,
} from "./admin";

describe("admin media boundaries", () => {
  it("creates immutable, normalized, content-derived image keys", () => {
    expect(
      createAdminMediaKey({
        folder: "projects",
        fileName: "Résumé Hero.final.PNG",
        contentType: "image/webp",
        id: "12345678-90ab-cdef",
        now: new Date("2026-08-21T12:00:00Z"),
      }),
    ).toBe("projects/2026/08/resume-hero-final-1234567890ab.webp");
  });

  it("allowlists folders and non-scriptable image types", () => {
    expect(isAdminMediaFolder("gallery")).toBe(true);
    expect(isAdminMediaFolder("../private")).toBe(false);
    expect(isAdminImageType("image/avif")).toBe(true);
    expect(isAdminImageType("image/svg+xml")).toBe(false);
    expect(isAdminImageType("video/mp4")).toBe(false);
    expect(ADMIN_MEDIA_MAX_BYTES).toBe(25 * 1024 * 1024);
  });

  it("rejects traversal and encodes public object URLs", () => {
    expect(isSafeAdminMediaKey("projects/2026/08/hero.webp")).toBe(true);
    expect(isSafeAdminMediaKey("projects/../private.txt")).toBe(false);
    expect(isSafeAdminMediaKey("/projects/hero.webp")).toBe(false);
    expect(publicMediaUrl("https://media.example.com", "gallery/a b.webp")).toBe(
      "https://media.example.com/gallery/a%20b.webp",
    );
  });
});
