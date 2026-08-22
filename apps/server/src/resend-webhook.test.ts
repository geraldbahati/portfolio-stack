import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";

import { verifyResendWebhook } from "./resend-webhook";

const secret = `whsec_${Buffer.from("production-webhook-test-secret-32b").toString("base64")}`;
const payload = JSON.stringify({
  type: "email.delivered",
  created_at: "2026-08-21T12:00:00.000Z",
  data: { email_id: "email_123" },
});

function signedHeaders(body = payload) {
  const id = "msg_production_readiness";
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(id, timestamp, body);

  return {
    id,
    timestamp: String(Math.floor(timestamp.getTime() / 1000)),
    signature,
  };
}

describe("verifyResendWebhook", () => {
  it("returns a cryptographically verified event and its delivery id", () => {
    const result = verifyResendWebhook({
      apiKey: "re_unit_test_only",
      payload,
      webhookSecret: secret,
      headers: signedHeaders(),
    });

    expect(result.webhookId).toBe("msg_production_readiness");
    expect(result.event).toMatchObject({
      type: "email.delivered",
      data: { email_id: "email_123" },
    });
  });

  it("rejects a payload changed after signing", () => {
    expect(() =>
      verifyResendWebhook({
        apiKey: "re_unit_test_only",
        payload: payload.replace("email_123", "email_forged"),
        webhookSecret: secret,
        headers: signedHeaders(),
      }),
    ).toThrow();
  });

  it("rejects requests missing any required signature header", () => {
    expect(() =>
      verifyResendWebhook({
        apiKey: "re_unit_test_only",
        payload,
        webhookSecret: secret,
        headers: { id: "msg_missing_headers" },
      }),
    ).toThrow("Missing required Resend webhook headers");
  });

  it("rejects a correctly signed event outside the timestamp tolerance", () => {
    const id = "msg_stale_event";
    const timestamp = new Date(Date.now() - 10 * 60 * 1000);

    expect(() =>
      verifyResendWebhook({
        apiKey: "re_unit_test_only",
        payload,
        webhookSecret: secret,
        headers: {
          id,
          timestamp: String(Math.floor(timestamp.getTime() / 1000)),
          signature: new Webhook(secret).sign(id, timestamp, payload),
        },
      }),
    ).toThrow();
  });
});
