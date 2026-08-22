/// <reference types="@cloudflare/workers-types" />
/// <reference path="../env.d.ts" />
import { env } from "cloudflare:workers";

import { describeEnvFailure } from "./validate";

const failure = describeEnvFailure(env as unknown as Record<string, unknown>);
if (failure) {
  throw new Error(`Worker environment is invalid — ${failure}`);
}

export { env };
