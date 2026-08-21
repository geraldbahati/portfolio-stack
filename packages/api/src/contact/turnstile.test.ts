import { describe, expect, it, vi } from "vitest";

import { verifyTurnstileToken } from "./turnstile";

describe("verifyTurnstileToken", () => {
  it("skips verification when no secret is configured", async () => {
    const fetchImpl = vi.fn();
    await expect(
      verifyTurnstileToken({ secret: undefined, token: undefined, fetchImpl }),
    ).resolves.toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a missing token when a secret is set", async () => {
    await expect(verifyTurnstileToken({ secret: "secret", token: undefined })).resolves.toBe(false);
  });

  it("returns the siteverify success flag", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    await expect(verifyTurnstileToken({ secret: "secret", token: "tok", fetchImpl })).resolves.toBe(
      true,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
