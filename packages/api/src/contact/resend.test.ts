import { describe, expect, it, vi } from "vitest";

import { sendResendEmail } from "./resend";

describe("sendResendEmail", () => {
  it("passes provider idempotency and a bounded request signal", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    await expect(
      sendResendEmail({
        apiKey: "test-key",
        from: "contact@example.com",
        to: "owner@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        idempotencyKey: "contact-inquiry/inquiry-1",
        fetchImpl,
      }),
    ).resolves.toBe("email-1");
    const request = fetchImpl.mock.calls[0]?.[1];
    expect(request.headers["Idempotency-Key"]).toBe("contact-inquiry/inquiry-1");
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });
});
