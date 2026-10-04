import { redactFreeText, sanitizeFrameLocation } from "../privacy/url";

/**
 * The bounds every exception sent to PostHog satisfies. The browser builder
 * applies them before sending and the `/monitoring` relay applies them again,
 * so a report the browser builds always passes the relay's schema and an
 * outdated or hostile client still cannot push unredacted data through.
 */
export const EXCEPTION_LIMITS = {
  chain: 5,
  frames: 50,
  type: 256,
  value: 1_024,
  location: 1_024,
  functionName: 256,
  module: 256,
  chunkId: 128,
} as const;

export type ExceptionPlatform = "web:javascript" | "node:javascript";

export type NormalizedFrame = {
  platform: ExceptionPlatform;
  filename?: string;
  function?: string;
  module?: string;
  lineno?: number;
  colno?: number;
  abs_path?: string;
  in_app?: boolean;
  chunk_id?: string;
};

export type NormalizedMechanism = {
  handled?: boolean;
  type?: string;
  synthetic?: boolean;
};

export type NormalizedException = {
  type?: string;
  value?: string;
  mechanism?: NormalizedMechanism;
  stacktrace?: { type: "raw"; frames?: NormalizedFrame[] };
};

/** Any frame-like object: parser output, or an already-validated relay payload. */
type FrameInput = { [Key in keyof NormalizedFrame]?: unknown };

type ExceptionInput = {
  type?: string;
  value?: string;
  mechanism?: NormalizedMechanism;
  stacktrace?: { type?: string; frames?: readonly FrameInput[] };
};

function boundedString(value: unknown, max: number) {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

function position(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Keep only the frame fields PostHog uses, bounded, with locations stripped of queries. */
export function normalizeFrame(frame: FrameInput, platform: ExceptionPlatform): NormalizedFrame {
  const filename = boundedString(frame.filename, Number.MAX_SAFE_INTEGER);
  const absPath = boundedString(frame.abs_path, Number.MAX_SAFE_INTEGER);
  const normalized: NormalizedFrame = {
    platform,
    filename: filename && sanitizeFrameLocation(filename, EXCEPTION_LIMITS.location),
    function: boundedString(frame.function, EXCEPTION_LIMITS.functionName),
    module: boundedString(frame.module, EXCEPTION_LIMITS.module),
    lineno: position(frame.lineno),
    colno: position(frame.colno),
    abs_path: absPath && sanitizeFrameLocation(absPath, EXCEPTION_LIMITS.location),
    in_app: typeof frame.in_app === "boolean" ? frame.in_app : undefined,
    chunk_id: boundedString(frame.chunk_id, EXCEPTION_LIMITS.chunkId),
  };
  // Drop absent keys so the payload carries no `undefined` noise.
  for (const key of Object.keys(normalized) as Array<keyof NormalizedFrame>) {
    if (normalized[key] === undefined) delete normalized[key];
  }
  return normalized;
}

export function normalizeExceptionList(
  exceptions: readonly ExceptionInput[],
  platform: ExceptionPlatform,
): NormalizedException[] {
  return exceptions.slice(0, EXCEPTION_LIMITS.chain).map((exception) => {
    const frames = exception.stacktrace?.frames;
    const normalized: NormalizedException = {};
    if (exception.type) normalized.type = redactFreeText(exception.type, EXCEPTION_LIMITS.type);
    if (exception.value) normalized.value = redactFreeText(exception.value, EXCEPTION_LIMITS.value);
    if (exception.mechanism) {
      normalized.mechanism = {
        handled: exception.mechanism.handled,
        type: exception.mechanism.type,
        synthetic: exception.mechanism.synthetic,
      };
    }
    if (frames) {
      // Frames run oldest to newest; when trimming, keep the ones nearest the throw.
      normalized.stacktrace = {
        type: "raw",
        frames: frames
          .slice(-EXCEPTION_LIMITS.frames)
          .map((frame) => normalizeFrame(frame, platform)),
      };
    }
    return normalized;
  });
}

/** The frame an error was thrown from: the newest in-app frame, else the newest frame. */
export function originFrame(exception: NormalizedException | undefined) {
  const frames = exception?.stacktrace?.frames ?? [];
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    if (frames[index]?.in_app !== false) return frames[index];
  }
  return frames.at(-1);
}
