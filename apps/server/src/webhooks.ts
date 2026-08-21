import { captureServerEvent } from "@portfolio-stack/analytics/server";
import { verifyTurnstileToken as verifyTurnstile } from "@portfolio-stack/api/contact";
import { updateContactStatusByEmailId } from "@portfolio-stack/db/contact";
import { env } from "@portfolio-stack/env/server";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

const STATUS_BY_EVENT: Record<string, "sent" | "delivered" | "failed"> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "failed",
  "email.failed": "failed",
};

export async function assertContactRateLimit(context: Context) {
  const limiter = env.CONTACT_RATE_LIMIT;
  if (!limiter) {
    return;
  }

  const ip =
    context.req.header("cf-connecting-ip") ??
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const { success } = await limiter.limit({ key: `contact:${ip}` });
  if (!success) {
    throw new HTTPException(429, { message: "Too many requests" });
  }
}

export async function verifyTurnstileToken(token: string | undefined, ip?: string) {
  return verifyTurnstile({
    secret: env.TURNSTILE_SECRET_KEY,
    token,
    ip,
  });
}

export async function handleResendWebhook(context: Context) {
  const payload = await context.req.text();
  const secret = env.RESEND_WEBHOOK_SECRET;

  if (secret) {
    const signature = context.req.header("svix-signature");
    if (!signature) {
      throw new HTTPException(401, { message: "Invalid webhook signature" });
    }
  }

  let eventType = "unknown";
  let emailId = "unknown";
  try {
    const body = JSON.parse(payload) as {
      type?: string;
      data?: { email_id?: string };
    };
    eventType = body.type ?? eventType;
    emailId = body.data?.email_id ?? emailId;
  } catch {
    // Delivery reporting must not fail closed on a malformed payload.
  }

  const status = STATUS_BY_EVENT[eventType];
  let matched = false;
  if (emailId !== "unknown" && status) {
    matched = await updateContactStatusByEmailId(emailId, status);
  }

  await captureServerEvent({
    apiKey: env.POSTHOG_PROJECT_KEY,
    host: env.POSTHOG_HOST,
    event: "inquiry_email_status_changed",
    distinctId: emailId,
    properties: {
      status: eventType.replace("email.", ""),
      email_id: emailId,
      matched_submission: matched,
    },
  });

  return context.json({ ok: true });
}
