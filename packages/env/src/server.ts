/// <reference types="@cloudflare/workers-types" />
/// <reference path="../env.d.ts" />
import { env as workerEnv } from "cloudflare:workers";

import { describeEnvFailure } from "./validate";

let checked = false;
let failure: string | null = null;

// Checked on first access rather than at module evaluation. Cloudflare runs
// the module once at upload to verify it starts, and bindings are not attached
// during that phase — validating eagerly fails the deploy with
// `ScriptStartupError` even when the environment is correct. Every call site
// reads `env` inside a request handler, where the bindings do exist.
export const env = new Proxy(workerEnv, {
  get(target, property, receiver) {
    if (!checked) {
      checked = true;
      failure = describeEnvFailure(target as unknown as Record<string, unknown>);
    }
    if (failure) {
      throw new Error(`Worker environment is invalid — ${failure}`);
    }
    return Reflect.get(target, property, receiver);
  },
});
