import { z } from "zod";

import { sanitizeUrl } from "../privacy/url";
import { EXCEPTION_LIMITS, type NormalizedException, normalizeExceptionList } from "./normalize";

/**
 * The only payload the same-origin `/monitoring` endpoint relays. Every field
 * is bounded, unknown keys are rejected, and the endpoint, not the browser,
 * supplies the project token, event name, environment, and release. A caller
 * can therefore send an exception report and nothing else.
 */
const frameSchema = z
  .object({
    platform: z.literal("web:javascript"),
    filename: z.string().max(EXCEPTION_LIMITS.location).optional(),
    function: z.string().max(EXCEPTION_LIMITS.functionName).optional(),
    module: z.string().max(EXCEPTION_LIMITS.module).optional(),
    lineno: z.number().int().nonnegative().optional(),
    colno: z.number().int().nonnegative().optional(),
    abs_path: z.string().max(EXCEPTION_LIMITS.location).optional(),
    in_app: z.boolean().optional(),
    chunk_id: z.string().max(EXCEPTION_LIMITS.chunkId).optional(),
  })
  .strict();

const exceptionSchema = z
  .object({
    type: z.string().max(EXCEPTION_LIMITS.type).optional(),
    value: z.string().max(EXCEPTION_LIMITS.value).optional(),
    mechanism: z
      .object({
        handled: z.boolean().optional(),
        type: z.enum(["generic", "onuncaughtexception", "onunhandledrejection"]).optional(),
        synthetic: z.boolean().optional(),
      })
      .strict()
      .optional(),
    stacktrace: z
      .object({
        type: z.literal("raw"),
        frames: z.array(frameSchema).max(EXCEPTION_LIMITS.frames).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const browserExceptionReportSchema = z
  .object({
    distinct_id: z.string().min(1).max(200),
    timestamp: z.iso.datetime().optional(),
    properties: z
      .object({
        $exception_list: z.array(exceptionSchema).min(1).max(EXCEPTION_LIMITS.chain),
        $exception_level: z.enum(["fatal", "error", "warning", "info"]).optional(),
        $exception_fingerprint: z.string().max(200).optional(),
        $current_url: z.string().max(2_048).optional(),
        $session_id: z.string().max(200).optional(),
        $release_id: z.string().max(200).optional(),
        operation: z.string().max(120).optional(),
      })
      .strict(),
  })
  .strict();

/**
 * What the browser sends and the relay forwards. Built from normalized
 * exceptions, so builder output and relay output share one type and every
 * report the builder makes fits the schema above (see report.test.ts).
 */
export type BrowserExceptionPayload = {
  distinct_id: string;
  timestamp?: string;
  properties: {
    $exception_list: NormalizedException[];
    $exception_level?: "fatal" | "error" | "warning" | "info";
    $exception_fingerprint?: string;
    $current_url?: string;
    $session_id?: string;
    $release_id?: string;
    operation?: string;
  };
};

/**
 * Validate an untrusted report, then re-apply every browser-side filter: URL
 * scrubbing, message redaction, and frame-location stripping. An outdated or
 * hostile client therefore cannot push credentials past the relay.
 */
export function parseBrowserExceptionReport(input: unknown): BrowserExceptionPayload | null {
  const parsed = browserExceptionReportSchema.safeParse(input);
  if (!parsed.success) return null;

  const report = parsed.data;
  const currentUrl = sanitizeUrl(report.properties.$current_url);
  const { $current_url: _discarded, ...properties } = report.properties;
  return {
    ...report,
    properties: {
      ...properties,
      $exception_list: normalizeExceptionList(properties.$exception_list, "web:javascript"),
      ...(currentUrl ? { $current_url: currentUrl } : {}),
    },
  };
}
