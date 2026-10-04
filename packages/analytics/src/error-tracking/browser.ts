import { sanitizeUrl } from "../privacy/url";
import type { ExceptionMechanism } from "./exception";
import { type NormalizedException, originFrame } from "./normalize";
import type { BrowserExceptionPayload } from "./report";

export type BrowserErrorIdentity = { distinctId: string; sessionId?: string };

export type BrowserErrorReporterOptions = {
  /** Same-origin relay that validates the report and adds the project token. */
  endpoint: string;
  /**
   * Links reports to the analytics session when the visitor has consented.
   * Without it each page load reports under an ephemeral, unstored identifier.
   */
  getIdentity?: () => BrowserErrorIdentity | null;
};

/** One misbehaving page must not turn into a flood of reports. */
const MAX_REPORTS_PER_PAGE = 10;
/** Bounds parsing work when a page throws repeatedly, including duplicates. */
const MAX_ATTEMPTS_PER_PAGE = 50;

const IGNORED_MESSAGES = [/^Script error\.?$/i, /ResizeObserver loop/i];
const EXTENSION_SOURCE = /^(?:chrome|moz|safari(?:-web)?)-extension:\/\//;

type PendingReport = {
  error: unknown;
  handled: boolean;
  mechanism: ExceptionMechanism;
  timestamp: string;
  operation?: string;
};

let options: BrowserErrorReporterOptions | null = null;
let builder: Promise<typeof import("./exception") | null> | null = null;
let pageId: string | null = null;
let attempts = 0;
let reportCount = 0;
const seen = new Set<string>();

function anonymousPageId() {
  pageId ??= globalThis.crypto?.randomUUID?.() ?? `page-${Date.now()}-${Math.random()}`;
  return pageId;
}

/** Defer the stack-parsing code until the page actually has an error. */
function loadBuilder() {
  builder ??= import("./exception").catch(() => {
    builder = null;
    return null;
  });
  return builder;
}

function describe(error: unknown) {
  if (error instanceof Error) return { message: error.message, stack: error.stack ?? "" };
  if (typeof error === "string") return { message: error, stack: "" };
  return { message: String(error), stack: "" };
}

function shouldIgnore(error: unknown, source?: string) {
  const { message, stack } = describe(error);
  if (IGNORED_MESSAGES.some((pattern) => pattern.test(message))) return true;
  if (source && EXTENSION_SOURCE.test(source)) return true;
  return stack.split("\n").some((line) => EXTENSION_SOURCE.test(line.trim().replace(/^at /, "")));
}

/**
 * Two reports are duplicates only when they share the error type, message,
 * the parsed frame the error was thrown from, and the operation. The same
 * message from two call sites is two problems and is reported twice.
 */
function dedupeKey(exceptions: NormalizedException[], operation: string | undefined) {
  const [exception] = exceptions;
  const frame = originFrame(exception);
  const location = frame
    ? `${frame.filename ?? ""}:${frame.lineno ?? ""}:${frame.colno ?? ""}`
    : "";
  return [exception?.type, exception?.value, location, operation ?? ""].join("\u0000");
}

/** The same report without stack traces: the smallest form the relay can accept. */
function withoutStacktraces(payload: BrowserExceptionPayload): BrowserExceptionPayload {
  return {
    ...payload,
    properties: {
      ...payload.properties,
      $exception_list: payload.properties.$exception_list.map(({ stacktrace: _, ...rest }) => rest),
    },
  };
}

function post(endpoint: string, payload: BrowserExceptionPayload) {
  return fetch(endpoint, {
    method: "POST",
    keepalive: true,
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function send(pending: PendingReport) {
  const reporter = options;
  const module = await loadBuilder();
  if (!reporter || !module) return;

  const exception = module.buildExceptionProperties(pending.error, {
    runtime: "browser",
    handled: pending.handled,
    mechanism: pending.mechanism,
  });

  const key = dedupeKey(exception.$exception_list, pending.operation);
  if (seen.has(key) || reportCount >= MAX_REPORTS_PER_PAGE) return;
  seen.add(key);
  reportCount += 1;

  let identity: BrowserErrorIdentity | null = null;
  try {
    identity = reporter.getIdentity?.() ?? null;
  } catch {
    identity = null;
  }

  const payload: BrowserExceptionPayload = {
    distinct_id: identity?.distinctId ?? anonymousPageId(),
    timestamp: pending.timestamp,
    properties: {
      $exception_list: exception.$exception_list,
      $exception_level: exception.$exception_level,
      $current_url: sanitizeUrl(window.location.href),
      ...(exception.$release_id ? { $release_id: exception.$release_id } : {}),
      ...(identity?.sessionId ? { $session_id: identity.sessionId } : {}),
      ...(pending.operation ? { operation: pending.operation } : {}),
    },
  };

  try {
    const response = await post(reporter.endpoint, payload);
    // A rejected report would otherwise vanish. Retry once without stack
    // traces, so the failure is at least counted and grouped by message.
    if (response.status === 400) {
      const fallback = await post(reporter.endpoint, withoutStacktraces(payload));
      if (!fallback.ok) warnInDevelopment("relay rejected the report", fallback.status);
    } else if (!response.ok && response.status !== 429) {
      warnInDevelopment("relay did not accept the report", response.status);
    }
  } catch {
    // Reporting is best effort; a failed report must never surface to the visitor.
  }
}

function warnInDevelopment(message: string, status: number) {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.warn(`[error-tracking] ${message}`, status);
  }
}

function enqueue(pending: PendingReport, source?: string) {
  if (!options || reportCount >= MAX_REPORTS_PER_PAGE || attempts >= MAX_ATTEMPTS_PER_PAGE) return;
  if (shouldIgnore(pending.error, source)) return;
  attempts += 1;
  void send(pending);
}

/**
 * Report uncaught browser errors through the first-party monitoring relay.
 * Installing costs two event listeners; the parser loads on the first error.
 */
export function installBrowserErrorReporter(reporterOptions: BrowserErrorReporterOptions) {
  if (typeof window === "undefined" || options) return;
  options = reporterOptions;

  window.addEventListener("error", (event) => {
    enqueue(
      {
        error: event.error ?? event.message,
        handled: false,
        mechanism: "onuncaughtexception",
        timestamp: new Date().toISOString(),
      },
      event.filename,
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    enqueue({
      error: event.reason,
      handled: false,
      mechanism: "onunhandledrejection",
      timestamp: new Date().toISOString(),
    });
  });
}

/** Report a failure the page recovered from but that still needs attention. */
export function captureBrowserException(error: unknown, context?: { operation?: string }) {
  enqueue({
    error,
    handled: true,
    mechanism: "generic",
    timestamp: new Date().toISOString(),
    operation: context?.operation,
  });
}
