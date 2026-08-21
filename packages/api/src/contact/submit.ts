import {
  countRecentContactSubmissions,
  insertContactSubmission,
  updateContactSubmission,
} from "@portfolio-stack/db/contact";
import { env } from "@portfolio-stack/env/server";

import { confirmationEmailHtml, inquiryEmailHtml } from "./email";
import { gateContactSubmission } from "./gate";
import { sendResendEmail } from "./resend";
import {
  CONTACT_EMAIL,
  type ContactSubmitInput,
  type ContactSubmitResult,
  contactSubmitSchema,
} from "./schema";
import { verifyTurnstileToken } from "./turnstile";

const SUCCESS_MESSAGE = "Thank you for your message! I'll get back to you soon.";
const FAIL_MESSAGE = `The form could not be sent. Please try again or email ${CONTACT_EMAIL}.`;

async function assertIpRateLimit(ip: string) {
  const limiter = env.CONTACT_RATE_LIMIT;
  if (!limiter) {
    return true;
  }
  const { success } = await limiter.limit({ key: `contact:${ip}` });
  return success;
}

export async function submitContact(
  input: ContactSubmitInput,
  ip = "unknown",
): Promise<ContactSubmitResult> {
  const parsed = contactSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid submission.",
    };
  }

  const data = parsed.data;
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  const message = data.message.trim();

  const [turnstileOk, ipOk, perEmailCount, globalCount] = await Promise.all([
    verifyTurnstileToken({
      secret: env.TURNSTILE_SECRET_KEY,
      token: data.turnstileToken,
      ip,
    }),
    assertIpRateLimit(ip),
    countRecentContactSubmissions({ email }),
    countRecentContactSubmissions(),
  ]);

  if (!ipOk) {
    return { ok: false, error: "Too many requests. Please try again in a few minutes." };
  }

  const blocked = gateContactSubmission({
    honeypot: data.honeypot,
    turnstileOk,
    perEmailCount,
    globalCount,
  });
  if (blocked) {
    return { ok: false, error: blocked };
  }

  const senderEmail = env.SENDER_EMAIL;
  const recipientEmail = env.RECIPIENT_EMAIL;
  const apiKey = env.RESEND_API_KEY;
  const submissionId = crypto.randomUUID();

  await insertContactSubmission({
    id: submissionId,
    name,
    email,
    message,
  });

  if (!apiKey || !senderEmail || !recipientEmail) {
    if (env.ENVIRONMENT === "production") {
      await updateContactSubmission(submissionId, { status: "failed" });
      return { ok: false, error: FAIL_MESSAGE };
    }

    return { ok: true, message: SUCCESS_MESSAGE };
  }

  try {
    const submittedAt = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
    const emailId = await sendResendEmail({
      apiKey,
      from: senderEmail,
      to: recipientEmail,
      subject: `Portfolio Contact: ${name}`,
      html: inquiryEmailHtml({ name, email, message, submissionId, submittedAt }),
      replyTo: email,
    });

    if (!emailId) {
      throw new Error("resend failed");
    }

    await sendResendEmail({
      apiKey,
      from: senderEmail,
      to: email,
      subject: "Got your message — I'll be in touch soon",
      html: confirmationEmailHtml(name),
    });

    await updateContactSubmission(submissionId, { status: "sent", emailId });
    return { ok: true, message: SUCCESS_MESSAGE };
  } catch {
    await updateContactSubmission(submissionId, { status: "failed" });
    return { ok: false, error: FAIL_MESSAGE };
  }
}
