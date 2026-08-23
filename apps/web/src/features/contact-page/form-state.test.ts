import { describe, expect, it } from "vitest";

import { GREETINGS, PAGE_HEADING, PHONE_DISPLAY, WHATSAPP_HREF } from "./copy";
import { validateContactForm } from "./form-state";

describe("contact page copy", () => {
  it("keeps the live-site heading, greetings, and channels", () => {
    expect(PAGE_HEADING).toBe("Request a project");
    expect(PHONE_DISPLAY).toBe("0704713070");
    expect(WHATSAPP_HREF).toBe("https://wa.me/254704713070");
    expect(GREETINGS.map((item) => item.lang)).toContain("ja");
    expect(GREETINGS.map((item) => item.lang)).toContain("ar");
    expect(GREETINGS).toContainEqual({ id: "sw", text: "Habari", lang: "sw", dir: "ltr" });
    expect(GREETINGS.map((item) => item.lang)).toEqual(expect.arrayContaining(["so", "am", "pt"]));
  });
});

describe("validateContactForm", () => {
  it("rejects an incomplete inquiry", () => {
    const result = validateContactForm({
      name: "G",
      email: "bad",
      message: "short",
      privacyConsent: false,
      honeypot: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.message).toBeTruthy();
    expect(result.errors.privacyConsent).toBeTruthy();
  });

  it("accepts a complete inquiry", () => {
    const result = validateContactForm({
      name: "Ada",
      email: "ada@example.com",
      message: "Need an M-Pesa checkout on Cloudflare.",
      privacyConsent: true,
      honeypot: "",
    });
    expect(result.ok).toBe(true);
  });
});
