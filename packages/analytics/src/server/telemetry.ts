import {
  buildExceptionProperties,
  type ExceptionLevel,
  type ExceptionMechanism,
} from "../error-tracking/exception";
import { redactFreeText, scrubUrlProperties } from "../privacy/url";
import { type PostHogEvent, type PostHogProperties, sendPostHogEvents } from "./transport";

export type TelemetryValue = string | number | boolean | null | undefined;

/**
 * Safe correlation fields only: request, operation, and actor identifiers, and
 * small enumerations. Never names, email addresses, or message bodies.
 */
export type TelemetryContext = Record<string, TelemetryValue>;

export type ServerTelemetryConfig = {
  /** PostHog project token. Without one, failures are still logged. */
  apiKey: string | undefined;
  host?: string;
  service: string;
  environment: string;
  release?: string;
  /**
   * Hands delivery to the runtime (`ctx.waitUntil`) so a response never waits
   * on telemetry. Called synchronously with the delivery promise.
   */
  defer: (task: Promise<unknown>) => void;
  timeoutMs?: number;
};

export type CaptureExceptionInput = {
  /** Stable, low-cardinality name of the failing operation, e.g. `rpc.admin.media.delete`. */
  operation: string;
  level?: ExceptionLevel;
  handled?: boolean;
  mechanism?: ExceptionMechanism;
  /** Group by operation instead of message when the message varies per occurrence. */
  fingerprint?: string;
  context?: TelemetryContext;
};

export type CaptureEventInput = {
  distinctId: string;
  /** Deduplication key; PostHog drops repeats of the same `$insert_id`. */
  insertId?: string;
  properties?: TelemetryContext;
};

export interface ServerTelemetry {
  readonly context: TelemetryContext;
  capture(event: string, input: CaptureEventInput): void;
  captureException(error: unknown, input: CaptureExceptionInput): void;
  /** Forward an already-validated event, adding this service's base properties. */
  relay(event: PostHogEvent): void;
  withContext(context: TelemetryContext): ServerTelemetry;
}

const MAX_CONTEXT_STRING = 256;

// An error reported at one layer and rethrown must not be reported again by
// the layer that catches it next. Weak, so captured errors are still collected.
const reported = new WeakSet<object>();

function cleanContext(context: TelemetryContext): PostHogProperties {
  const cleaned: PostHogProperties = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    cleaned[key] =
      typeof value === "string" && value.length > MAX_CONTEXT_STRING
        ? value.slice(0, MAX_CONTEXT_STRING)
        : value;
  }
  return scrubUrlProperties(cleaned);
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { error_type: error.name, error_message: redactFreeText(error.message, 300) };
  }
  return { error_type: typeof error, error_message: redactFreeText(String(error), 300) };
}

/** Fallback identity for events with no actor: one per request, never per person. */
function distinctIdFor(context: TelemetryContext) {
  if (typeof context.actor_id === "string" && context.actor_id) return context.actor_id;
  if (typeof context.request_id === "string" && context.request_id) return context.request_id;
  return crypto.randomUUID();
}

export function createServerTelemetry(
  config: ServerTelemetryConfig,
  context: TelemetryContext = {},
): ServerTelemetry {
  const baseProperties: PostHogProperties = {
    service: config.service,
    environment: config.environment,
    ...(config.release ? { release: config.release } : {}),
    // Server-side events describe operations, not people, and Worker egress
    // addresses would produce meaningless locations.
    $process_person_profile: false,
    $geoip_disable: true,
    $lib: "portfolio-telemetry",
  };

  function deliver(events: PostHogEvent[]) {
    if (!config.apiKey) return;
    try {
      config.defer(
        sendPostHogEvents(
          { apiKey: config.apiKey, host: config.host, timeoutMs: config.timeoutMs },
          events,
        ),
      );
    } catch (error) {
      console.error({ event: "telemetry_defer_failed", reason: String(error) });
    }
  }

  return {
    context,

    capture(event, input) {
      deliver([
        {
          event,
          distinct_id: input.distinctId,
          timestamp: new Date().toISOString(),
          properties: {
            ...baseProperties,
            ...cleanContext({ ...context, ...input.properties }),
            ...(input.insertId ? { $insert_id: input.insertId } : {}),
          },
        },
      ]);
    },

    captureException(error, input) {
      if (typeof error === "object" && error !== null) {
        if (reported.has(error)) return;
        reported.add(error);
      }

      const merged = cleanContext({ ...context, ...input.context, operation: input.operation });
      const level = input.level ?? "error";

      // Workers Logs keep a structured record even when PostHog is unavailable.
      const log = level === "warning" || level === "info" ? console.warn : console.error;
      log({
        event: "exception",
        service: config.service,
        level,
        handled: input.handled ?? true,
        ...describeError(error),
        ...merged,
      });

      let exception: ReturnType<typeof buildExceptionProperties>;
      try {
        exception = buildExceptionProperties(error, {
          runtime: "worker",
          handled: input.handled,
          mechanism: input.mechanism,
          level,
          fingerprint: input.fingerprint,
        });
      } catch {
        return;
      }

      deliver([
        {
          event: "$exception",
          distinct_id: distinctIdFor({ ...context, ...input.context }),
          timestamp: new Date().toISOString(),
          properties: { ...baseProperties, ...merged, ...exception },
        },
      ]);
    },

    relay(event) {
      deliver([{ ...event, properties: { ...baseProperties, ...event.properties } }]);
    },

    withContext(extra) {
      return createServerTelemetry(config, { ...context, ...extra });
    },
  };
}

/** Telemetry for code paths that have no runtime to defer to, such as unit tests. */
export const noopTelemetry: ServerTelemetry = createServerTelemetry({
  apiKey: undefined,
  service: "noop",
  environment: "test",
  defer: () => {},
});
