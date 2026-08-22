import { describe, expect, it } from "vitest";

import { resolveSentryEnvelopeTarget } from "./sentry-tunnel";

const dsn = "https://public-key@o4500000000000000.ingest.de.sentry.io/4500000000000001";

function envelope(envelopeDsn = dsn) {
  return `${JSON.stringify({ dsn: envelopeDsn, sent_at: "2026-08-21T12:00:00.000Z" })}\n{}`;
}

describe("resolveSentryEnvelopeTarget", () => {
  it("resolves the configured Sentry Cloud project", () => {
    expect(resolveSentryEnvelopeTarget(envelope(), dsn)).toEqual({
      envelope: envelope(),
      ingestUrl: "https://o4500000000000000.ingest.de.sentry.io/api/4500000000000001/envelope/",
    });
  });

  it("rejects an envelope for a different DSN", () => {
    expect(
      resolveSentryEnvelopeTarget(envelope("https://attacker@o1.ingest.sentry.io/999"), dsn),
    ).toBeNull();
  });

  it("rejects malformed, oversized, and non-Sentry configurations", () => {
    expect(resolveSentryEnvelopeTarget("not-json\n{}", dsn)).toBeNull();
    expect(
      resolveSentryEnvelopeTarget(`{"dsn":"${dsn}"}\n${"x".repeat(1_000_000)}`, dsn),
    ).toBeNull();
    expect(
      resolveSentryEnvelopeTarget(
        envelope("https://key@example.com/1"),
        "https://key@example.com/1",
      ),
    ).toBeNull();
  });
});
