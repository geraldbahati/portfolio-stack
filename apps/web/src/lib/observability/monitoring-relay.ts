import { parseBrowserExceptionReport } from "@portfolio-stack/analytics/error-tracking/report";
import type { ServerTelemetry } from "@portfolio-stack/analytics/server";

/** A bounded exception report is a few kilobytes; anything near this is not one. */
export const MAX_REPORT_BYTES = 64 * 1024;

type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type MonitoringRelayDeps = {
  enabled: boolean;
  telemetry: ServerTelemetry;
  limiter?: RateLimiter;
};

const responseHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function reply(status: number) {
  return new Response(null, { status, headers: responseHeaders });
}

/**
 * Read at most `maxBytes` from a body stream. Stops and cancels the stream as
 * soon as the limit is crossed, so an oversized or endless body never sits in
 * memory or keeps the Worker busy.
 */
export async function readBoundedText(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string | null> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * The browser's error-report relay. Cheap rejections run first (method,
 * declared size, rate limit) so abusive traffic costs as little as possible;
 * accepted reports are forwarded after the response, under a timeout.
 */
export async function handleMonitoringRequest(
  request: Request,
  deps: MonitoringRelayDeps,
): Promise<Response> {
  if (!deps.enabled) return reply(503);

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") return reply(415);

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_REPORT_BYTES) return reply(413);

  if (deps.limiter) {
    const client = request.headers.get("cf-connecting-ip") ?? "unknown";
    const { success } = await deps.limiter.limit({ key: `monitoring:${client}` });
    if (!success) return reply(429);
  }

  const text = await readBoundedText(request.body, MAX_REPORT_BYTES);
  if (text === null) return reply(413);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return reply(400);
  }

  const report = parseBrowserExceptionReport(payload);
  if (!report) return reply(400);

  deps.telemetry.relay({
    event: "$exception",
    distinct_id: report.distinct_id,
    timestamp: report.timestamp,
    properties: { ...report.properties, service: "browser" },
  });
  return reply(202);
}
