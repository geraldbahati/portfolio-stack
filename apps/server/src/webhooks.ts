import { verifyTurnstileToken as verifyTurnstile } from "@portfolio-stack/api/contact";
import { updateContactStatusByEmailId } from "@portfolio-stack/db/contact";
import { env } from "@portfolio-stack/env/server";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import type { AppEnv } from "./app-env";
import { verifyResendWebhook } from "./resend-webhook";

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

export async function handleResendWebhook(context: Context<AppEnv>) {
  const telemetry = context.get("telemetry");
  const payload = await context.req.text();
  const secret = env.RESEND_WEBHOOK_SECRET;
  const apiKey = env.RESEND_API_KEY;

  if (!secret || !apiKey) {
    telemetry.captureException(new Error("Resend webhook verification is not configured"), {
      operation: "webhook.resend",
      fingerprint: "webhook.resend.not_configured",
    });
    throw new HTTPException(503, { message: "Webhook unavailable" });
  }

  let verified: ReturnType<typeof verifyResendWebhook>;
  try {
    verified = verifyResendWebhook({
      apiKey,
      payload,
      webhookSecret: secret,
      headers: {
        id: context.req.header("svix-id"),
        timestamp: context.req.header("svix-timestamp"),
        signature: context.req.header("svix-signature"),
      },
    });
  } catch {
    throw new HTTPException(400, { message: "Invalid webhook" });
  }

  const body = verified.event as {
    type?: string;
    data?: { email_id?: string };
  };
  const eventType = body.type ?? "unknown";
  const emailId = body.data?.email_id ?? "unknown";

  const status = STATUS_BY_EVENT[eventType];
  let matched = false;
  if (emailId !== "unknown" && status) {
    matched = await updateContactStatusByEmailId(emailId, status);
  }

  // The delivery status is persisted above; analytics is optional and is sent
  // after the response, so PostHog latency never delays the acknowledgement.
  telemetry.capture("inquiry_email_status_changed", {
    distinctId: emailId,
    insertId: verified.webhookId,
    properties: {
      status: eventType.replace("email.", ""),
      email_id: emailId,
      matched_submission: matched,
    },
  });

  return context.json({ ok: true });
}
