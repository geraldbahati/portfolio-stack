import {
  createDefaultStackParser,
  createStackParser,
  DOMExceptionCoercer,
  ErrorCoercer,
  ErrorPropertiesBuilder,
  getInjectedReleaseId,
  nodeStackLineParser,
  ObjectCoercer,
  PrimitiveCoercer,
  type SeverityLevel,
  StringCoercer,
} from "@posthog/core/error-tracking";

import { type NormalizedException, normalizeExceptionList } from "./normalize";

/** Where the exception was raised; decides how its stack trace is parsed. */
export type ExceptionRuntime = "browser" | "worker";

export type ExceptionMechanism =
  | "generic"
  | "onuncaughtexception"
  | "onunhandledrejection"
  | "middleware";

export type ExceptionLevel = Extract<SeverityLevel, "fatal" | "error" | "warning" | "info">;

export type ExceptionProperties = {
  $exception_list: NormalizedException[];
  $exception_level: ExceptionLevel;
  $exception_fingerprint?: string;
  /** Set when the bundle was built with PostHog's source-map plugin. */
  $release_id?: string;
};

export type BuildExceptionOptions = {
  runtime: ExceptionRuntime;
  handled?: boolean;
  mechanism?: ExceptionMechanism;
  level?: ExceptionLevel;
  /** Stable grouping key for errors whose message varies, such as an operation name. */
  fingerprint?: string;
};

const builders = new Map<ExceptionRuntime, ErrorPropertiesBuilder>();

function builderFor(runtime: ExceptionRuntime) {
  let builder = builders.get(runtime);
  if (!builder) {
    // Workers produce V8 stack traces; the Node parser understands them and
    // marks bundled code as in-app. Browsers need the Chrome/Gecko parsers.
    const parser =
      runtime === "worker"
        ? createStackParser("node:javascript", nodeStackLineParser)
        : createDefaultStackParser();
    builder = new ErrorPropertiesBuilder(
      [
        new DOMExceptionCoercer(),
        new ErrorCoercer(),
        new ObjectCoercer(),
        new StringCoercer(),
        new PrimitiveCoercer(),
      ],
      parser,
    );
    builders.set(runtime, builder);
  }
  return builder;
}

/**
 * Convert any thrown value into PostHog's `$exception` properties. Messages
 * are redacted, frame locations lose their queries, every field is bounded,
 * the cause chain is capped, and frame variables are never collected.
 */
export function buildExceptionProperties(
  error: unknown,
  options: BuildExceptionOptions,
): ExceptionProperties {
  const built = builderFor(options.runtime).buildFromUnknown(error, {
    mechanism: {
      handled: options.handled ?? true,
      type: options.mechanism ?? "generic",
    },
  });

  const releaseId = options.runtime === "browser" ? getInjectedReleaseId() : undefined;

  return {
    $exception_list: normalizeExceptionList(
      built.$exception_list,
      options.runtime === "worker" ? "node:javascript" : "web:javascript",
    ),
    $exception_level: options.level ?? "error",
    ...(options.fingerprint ? { $exception_fingerprint: options.fingerprint } : {}),
    ...(releaseId ? { $release_id: releaseId } : {}),
  };
}
