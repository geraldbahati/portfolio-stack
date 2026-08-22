const MAX_ENVELOPE_BYTES = 1_000_000;
const SENTRY_INGEST_HOST = /^(?:[^.]+\.)?ingest(?:\.(?:us|de))?\.sentry\.io$/i;

export type SentryEnvelopeTarget = {
  envelope: string;
  ingestUrl: string;
};

/**
 * Accept browser envelopes only for the configured Sentry project. The DSN in
 * an envelope is caller-controlled and must never become an open proxy target.
 */
export function resolveSentryEnvelopeTarget(
  envelope: string,
  configuredDsn: string | undefined,
): SentryEnvelopeTarget | null {
  if (!configuredDsn || new TextEncoder().encode(envelope).byteLength > MAX_ENVELOPE_BYTES) {
    return null;
  }

  const headerLine = envelope.split("\n", 1)[0];
  if (!headerLine) return null;

  let envelopeDsn: string | undefined;
  try {
    envelopeDsn = (JSON.parse(headerLine) as { dsn?: unknown }).dsn as string | undefined;
  } catch {
    return null;
  }
  if (typeof envelopeDsn !== "string") return null;

  try {
    const configured = new URL(configuredDsn);
    const supplied = new URL(envelopeDsn);
    const projectId = configured.pathname.split("/").filter(Boolean).at(-1);

    if (
      configured.protocol !== "https:" ||
      !configured.username ||
      configured.password ||
      !SENTRY_INGEST_HOST.test(configured.hostname) ||
      !projectId ||
      !/^\d+$/.test(projectId) ||
      supplied.href !== configured.href
    ) {
      return null;
    }

    return {
      envelope,
      ingestUrl: `https://${configured.host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}
