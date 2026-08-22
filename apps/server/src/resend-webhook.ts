import { Resend } from "resend";

type ResendWebhookEvent = ReturnType<Resend["webhooks"]["verify"]>;

export interface VerifiedResendWebhook {
  event: ResendWebhookEvent;
  webhookId: string;
}

/**
 * Verify the untouched request body before trusting any delivery event fields.
 * Resend signatures also enforce a five-minute timestamp tolerance.
 */
export function verifyResendWebhook(input: {
  apiKey: string;
  payload: string;
  webhookSecret: string;
  headers: {
    id?: string;
    timestamp?: string;
    signature?: string;
  };
}): VerifiedResendWebhook {
  const { id, timestamp, signature } = input.headers;
  if (!id || !timestamp || !signature) {
    throw new Error("Missing required Resend webhook headers");
  }

  const event = new Resend(input.apiKey).webhooks.verify({
    payload: input.payload,
    headers: { id, timestamp, signature },
    webhookSecret: input.webhookSecret,
  });

  return { event, webhookId: id };
}
