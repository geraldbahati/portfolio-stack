import { describe, expect, it } from "vitest";
import { escapeHtml, inquiryEmailHtml } from "./email";
import { gateContactSubmission } from "./gate";
import { contactFormSchema, flattenContactErrors } from "./schema";

describe("contactFormSchema", () => {
  it("accepts a live-site shaped inquiry", () => {
    const parsed = contactFormSchema.parse({
      name: "Ada",
      email: "ada@example.com",
      message: "Need an M-Pesa checkout on Cloudflare.",
      privacyConsent: true,
      honeypot: "",
    });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects a missing privacy consent and a short message", () => {
    const result = contactFormSchema.safeParse({
      name: "A",
      email: "nope",
      message: "hi",
      privacyConsent: false,
    });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    const errors = flattenContactErrors(result.error);
    expect(errors.name).toMatch(/at least 2/);
    expect(errors.email).toMatch(/valid email/i);
    expect(errors.message).toMatch(/at least 10/);
    expect(errors.privacyConsent).toMatch(/privacy policy/);
  });
});

describe("gateContactSubmission", () => {
  it("fails closed on honeypot, captcha, and rate limits", () => {
    expect(
      gateContactSubmission({
        honeypot: "bot",
        turnstileOk: true,
        perEmailCount: 0,
        globalCount: 0,
      }),
    ).toMatch(/Invalid submission/);
    expect(
      gateContactSubmission({
        honeypot: "",
        turnstileOk: false,
        perEmailCount: 0,
        globalCount: 0,
      }),
    ).toMatch(/Invalid submission/);
    expect(
      gateContactSubmission({
        honeypot: "",
        turnstileOk: true,
        perEmailCount: 3,
        globalCount: 0,
      }),
    ).toMatch(/Too many requests/);
    expect(
      gateContactSubmission({
        honeypot: "",
        turnstileOk: true,
        perEmailCount: 0,
        globalCount: 0,
      }),
    ).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("neutralizes markup before it reaches Resend HTML", () => {
    expect(escapeHtml("O'Brien <img>")).toBe("O&#x27;Brien &lt;img&gt;");
    expect(
      inquiryEmailHtml({
        name: "<script>",
        email: "a@b.c",
        message: "hello\nworld",
        submissionId: "abc",
        submittedAt: "now",
      }),
    ).toContain("&lt;script&gt;");
    expect(
      inquiryEmailHtml({
        name: "Ada",
        email: "a@b.c",
        message: "hello\nworld",
        submissionId: "abc",
        submittedAt: "now",
      }),
    ).toContain("hello<br>world");
  });
});
