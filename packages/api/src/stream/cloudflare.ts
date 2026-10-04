import { env } from "@portfolio-stack/env/server";

const STREAM_API_TIMEOUT_MS = 10_000;

/** Cloudflare Stream video UIDs are short alphanumeric identifiers. */
export const STREAM_UID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

export class StreamConfigurationError extends Error {
  constructor() {
    super(
      "Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN.",
    );
    this.name = "StreamConfigurationError";
  }
}

/** A non-success response from the Stream API. Carries only the status, never the body. */
export class StreamApiError extends Error {
  constructor(
    readonly operation: string,
    readonly status: number,
  ) {
    super(`Cloudflare Stream ${operation} failed with status ${status}`);
    this.name = "StreamApiError";
  }
}

type StreamEnvelope<T> = {
  success: boolean;
  result?: T;
};

/**
 * True when Stream answered and refused the request, so it certainly did not
 * act on it. A 408, a 5xx, a timeout, or a network failure leaves the outcome
 * unknown: the work may have completed before the response was lost.
 */
export function isDefinitiveStreamRejection(error: unknown) {
  return (
    error instanceof StreamConfigurationError ||
    (error instanceof StreamApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 408)
  );
}

function streamRequest(path: string, init: RequestInit = {}) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) throw new StreamConfigurationError();

  return fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream${path}`, {
    ...init,
    signal: AbortSignal.timeout(STREAM_API_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

function videoPath(uid: string) {
  if (!STREAM_UID_PATTERN.test(uid)) throw new StreamApiError("validate_uid", 400);
  return `/${encodeURIComponent(uid)}`;
}

export async function createStreamDirectUpload(input: {
  maxDurationSeconds: number;
  allowedOrigins: string[];
}) {
  const response = await streamRequest("/direct_upload", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new StreamApiError("direct_upload", response.status);

  const data = (await response.json()) as StreamEnvelope<{ uploadURL: string; uid: string }>;
  if (!data.success || !data.result) throw new StreamApiError("direct_upload", response.status);
  return data.result;
}

export async function deleteStreamVideo(uid: string) {
  const response = await streamRequest(videoPath(uid), { method: "DELETE" });
  if (!response.ok) throw new StreamApiError("delete", response.status);
}

/** Whether a video still exists; `unknown` when the API cannot say right now. */
export async function getStreamVideoState(uid: string): Promise<"present" | "absent" | "unknown"> {
  const response = await streamRequest(videoPath(uid));
  if (response.ok) return "present";
  if (response.status === 404) return "absent";
  return "unknown";
}
