import { beforeEach, describe, expect, it, vi } from "vitest";

import { type SubmitContactOptions, submitContact } from "./submit";

const mocks = vi.hoisted(() => ({
  reserve: vi.fn(),
  accepted: vi.fn(),
  failed: vi.fn(),
  send: vi.fn(),
  verify: vi.fn(),
  captureException: vi.fn(),
}));

const telemetry = {
  captureException: mocks.captureException,
  withContext: () => telemetry,
} as unknown as SubmitContactOptions["telemetry"];
const options: SubmitContactOptions = { telemetry };

vi.mock("@portfolio-stack/db/contact", () => ({
  reserveContactSubmission: mocks.reserve,
  recordContactEmailAccepted: mocks.accepted,
  recordContactSendFailure: mocks.failed,
}));
vi.mock("@portfolio-stack/env/server", () => ({
  env: {
    RESEND_API_KEY: "test-key",
    SENDER_EMAIL: "contact@example.com",
    RECIPIENT_EMAIL: "owner@example.com",
    ENVIRONMENT: "production",
  },
}));
vi.mock("./resend", () => ({ sendResendEmail: mocks.send }));
vi.mock("./turnstile", () => ({ verifyTurnstileToken: mocks.verify }));

const input = {
  name: "Test Sender",
  email: "sender@example.com",
  message: "I would like to discuss a project.",
  privacyConsent: true,
};
const submission = {
  ...input,
  id: "inquiry-1",
  emailId: null,
  createdAt: new Date("2026-09-05T12:00:00Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.reserve.mockResolvedValue({ ...submission });
  mocks.verify.mockResolvedValue(true);
});

describe("submitContact", () => {
  it("persists the inquiry before confirmation and succeeds if confirmation throws", async () => {
    mocks.send.mockResolvedValueOnce("email-1").mockImplementationOnce(() => {
      expect(mocks.accepted).toHaveBeenCalledWith("inquiry-1", "email-1");
      throw new Error("confirmation timed out");
    });
    expect(await submitContact(input, options)).toMatchObject({ ok: true });
    expect(mocks.failed).not.toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: "contact.send_confirmation", level: "warning" }),
    );
  });

  it("reports failure when the primary email is rejected", async () => {
    mocks.send.mockResolvedValueOnce(null);
    expect(await submitContact(input, options)).toMatchObject({ ok: false });
    expect(mocks.failed).toHaveBeenCalledWith("inquiry-1");
    expect(mocks.accepted).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: "contact.send_inquiry" }),
    );
  });

  it("uses the same primary payload and idempotency key after an ambiguous timeout", async () => {
    mocks.send.mockRejectedValueOnce(new Error("timeout"));
    expect(await submitContact(input, options)).toMatchObject({ ok: false });
    mocks.send.mockResolvedValueOnce("email-1").mockResolvedValueOnce("confirmation-1");
    expect(await submitContact(input, options)).toMatchObject({ ok: true });
    expect(mocks.send.mock.calls[0]?.[0]).toEqual(mocks.send.mock.calls[1]?.[0]);
    expect(mocks.send.mock.calls[0]?.[0].idempotencyKey).toBe("contact-inquiry/inquiry-1");
    expect(mocks.send.mock.calls[2]?.[0].idempotencyKey).toBe("contact-confirmation/inquiry-1");
  });

  it("acknowledges retries of an accepted inquiry without sending again", async () => {
    mocks.reserve.mockResolvedValueOnce({ ...submission, emailId: "email-1", status: "delivered" });
    expect(await submitContact(input, options)).toMatchObject({ ok: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends nothing when the atomic quota reservation is rejected", async () => {
    mocks.reserve.mockResolvedValueOnce(null);
    expect(await submitContact(input, options)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Too many"),
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.captureException).not.toHaveBeenCalled();
  });

  it("does not mark an accepted email failed when persistence is unavailable", async () => {
    mocks.send.mockResolvedValueOnce("email-1");
    mocks.accepted.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(submitContact(input, options)).rejects.toThrow("database unavailable");
    expect(mocks.failed).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalledOnce();
  });
});
