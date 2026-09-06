import {
  recordContactEmailAccepted,
  recordContactSendFailure,
  reserveContactSubmission,
} from "@portfolio-stack/db/contact";
import { env } from "@portfolio-stack/env/server";

import { confirmationEmailHtml, inquiryEmailHtml } from "./email";
import { CONTACT_EMAIL_HOUR_LIMIT, CONTACT_GLOBAL_HOUR_LIMIT, gateContactSubmission } from "./gate";
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

  const [turnstileOk, ipOk] = await Promise.all([
    verifyTurnstileToken({
      secret: env.TURNSTILE_SECRET_KEY,
      token: data.turnstileToken,
      ip,
    }),
    assertIpRateLimit(ip),
  ]);

  if (!ipOk) {
    return { ok: false, error: "Too many requests. Please try again in a few minutes." };
  }

  const blocked = gateContactSubmission({
    honeypot: data.honeypot,
    turnstileOk,
  });
  if (blocked) {
    return { ok: false, error: blocked };
  }

  const senderEmail = env.SENDER_EMAIL;
  const recipientEmail = env.RECIPIENT_EMAIL;
  const apiKey = env.RESEND_API_KEY;
  const submission = await reserveContactSubmission({
    id: crypto.randomUUID(),
    name,
    email,
    message,
    perEmailLimit: CONTACT_EMAIL_HOUR_LIMIT,
    globalLimit: CONTACT_GLOBAL_HOUR_LIMIT,
  });

  if (!submission) {
    return { ok: false, error: "Too many requests. Please try again in a few minutes." };
  }
  const submissionId = submission.id;

  // The inquiry was already accepted by the provider. Retrying the form should
  // neither send it again nor turn a delivery webhook failure into a new send.
  if (submission.emailId) {
    return { ok: true, message: SUCCESS_MESSAGE };
  }

  if (!apiKey || !senderEmail || !recipientEmail) {
    if (env.ENVIRONMENT === "production") {
      await recordContactSendFailure(submissionId);
      return { ok: false, error: FAIL_MESSAGE };
    }

    return { ok: true, message: SUCCESS_MESSAGE };
  }

  let emailId: string | null;
  try {
    const submittedAt = submission.createdAt.toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
    });
    emailId = await sendResendEmail({
      apiKey,
      from: senderEmail,
      to: recipientEmail,
      subject: `Portfolio Contact: ${name}`,
      html: inquiryEmailHtml({ name, email, message, submissionId, submittedAt }),
      replyTo: email,
      idempotencyKey: `contact-inquiry/${submissionId}`,
    });

    if (!emailId) {
      throw new Error("resend failed");
    }
  } catch {
    await recordContactSendFailure(submissionId);
    return { ok: false, error: FAIL_MESSAGE };
  }

  // Persist the primary send before the optional acknowledgement. If this
  // write fails, a retry reuses the provider key to recover the accepted email.
  await recordContactEmailAccepted(submissionId, emailId);

  try {
    const confirmationId = await sendResendEmail({
      apiKey,
      from: senderEmail,
      to: email,
      subject: "Got your message — I'll be in touch soon",
      html: confirmationEmailHtml(name),
      idempotencyKey: `contact-confirmation/${submissionId}`,
    });
    if (!confirmationId) {
      console.error("[contact] Confirmation email was not accepted", { submissionId });
    }
  } catch {
    console.error("[contact] Confirmation email request failed", { submissionId });
  }
  return { ok: true, message: SUCCESS_MESSAGE };
}
