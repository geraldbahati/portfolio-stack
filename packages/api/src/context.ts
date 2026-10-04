import type { ServerTelemetry } from "@portfolio-stack/analytics/server";
import { createAuth } from "@portfolio-stack/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
  /** Request-scoped telemetry, already carrying the request's correlation IDs. */
  telemetry: ServerTelemetry;
  requestId: string;
};

export async function createContext({ context, telemetry, requestId }: CreateContextOptions) {
  const session = await createAuth().api.getSession({
    headers: context.req.raw.headers,
  });
  const actorId = session?.user.id;
  return {
    auth: null,
    session,
    requestId,
    telemetry: actorId ? telemetry.withContext({ actor_id: actorId }) : telemetry,
    ip:
      context.req.header("cf-connecting-ip") ??
      context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown",
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
