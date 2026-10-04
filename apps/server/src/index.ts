import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@portfolio-stack/api/context";
import { reportProcedureError } from "@portfolio-stack/api/errors";
import { reconcileAuditedOperations } from "@portfolio-stack/api/operations";
import { appRouter } from "@portfolio-stack/api/routers/index";
import {
  createAuth,
  handleSeedAdmin,
  isAdminEnabled,
  isAllowedAdminEmail,
  parseTrustedOrigins,
} from "@portfolio-stack/auth";
import { handleSeedProjects } from "@portfolio-stack/db/seeds/http";
import { env } from "@portfolio-stack/env/server";
import type { Context as HonoContext } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { handleAdminMediaPreview, handleAdminMediaUpload } from "./admin-media";
import type { AppEnv } from "./app-env";
import { requestIdFor, workerTelemetry } from "./telemetry";
import { handleResendWebhook } from "./webhooks";

const app = new Hono<AppEnv>();
const trustedOrigins = parseTrustedOrigins(env.CORS_ORIGIN);

app.use("/*", async (c, next) => {
  const startedAt = performance.now();
  const requestId = requestIdFor(c.req.raw);
  c.set("requestId", requestId);
  c.set("telemetry", workerTelemetry(c.executionCtx, { request_id: requestId }));
  try {
    await next();
  } finally {
    c.header("X-Request-Id", requestId);
    // Cloudflare indexes object fields directly. Keep the request target to
    // the path only so query parameters and message contents cannot leak.
    console.log({
      event: "http_request",
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: Math.round(performance.now() - startedAt),
      request_id: requestId,
    });
  }
});
app.use("/*", async (c, next) => {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  c.header("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  if (env.ENVIRONMENT === "production") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  const privatePath = ["/api/auth/", "/rpc/admin/", "/internal/", "/webhooks/"].some((prefix) =>
    c.req.path.startsWith(prefix),
  );
  if (privatePath) c.header("Cache-Control", "private, no-store");
});
app.use(
  "/*",
  cors({
    origin: trustedOrigins,
    allowMethods: ["GET", "POST", "PUT", "OPTIONS", "DELETE"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-seed-secret",
      "x-media-folder",
      "x-media-filename",
      "x-media-alt",
    ],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

app.post("/internal/seed-admin", (c) => {
  if (!isAdminEnabled(env.ENABLE_ADMIN_SEED)) return c.notFound();
  return handleSeedAdmin(c.req.raw);
});
app.post("/internal/seed-projects", (c) => {
  if (!isAdminEnabled(env.ENABLE_ADMIN_SEED)) return c.notFound();
  return handleSeedProjects(c.req.raw);
});

app.post("/webhooks/resend", (c) => handleResendWebhook(c));

function requestContext(c: HonoContext<AppEnv>) {
  return createContext({
    context: c,
    telemetry: c.get("telemetry"),
    requestId: c.get("requestId"),
  });
}

async function getAdminActor(c: HonoContext<AppEnv>) {
  const context = await requestContext(c);
  const user = context.session?.user;
  if (!user) return { ok: false as const, error: "Unauthorized" as const, status: 401 as const };
  if (!isAdminEnabled(env.ENABLE_ADMIN) || !isAllowedAdminEmail(user.email, env.ENVIRONMENT)) {
    return { ok: false as const, error: "Forbidden" as const, status: 403 as const };
  }
  return { ok: true as const, user, telemetry: context.telemetry };
}

app.put("/internal/admin-media/upload", async (c) => {
  const origin = c.req.header("Origin");
  if (!origin || !trustedOrigins.includes(origin)) {
    return c.json({ error: "Forbidden" }, 403, { "Cache-Control": "private, no-store" });
  }

  const actor = await getAdminActor(c);
  if (!actor.ok) {
    return c.json({ error: actor.error }, actor.status, { "Cache-Control": "private, no-store" });
  }
  return handleAdminMediaUpload(c.req.raw, {
    actor: { id: actor.user.id, email: actor.user.email, requestId: c.get("requestId") },
    telemetry: actor.telemetry,
  });
});

app.get("/internal/admin-media/object", async (c) => {
  const actor = await getAdminActor(c);
  if (!actor.ok) {
    return c.json({ error: actor.error }, actor.status, { "Cache-Control": "private, no-store" });
  }
  return handleAdminMediaPreview(c.req.query("key") ?? "");
});

app.get("/internal/admin-session", async (c) => {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };

  const actor = await getAdminActor(c);
  if (!actor.ok) return c.json({ error: actor.error }, actor.status, headers);

  return c.json(
    {
      user: {
        id: actor.user.id,
        email: actor.user.email,
        name: actor.user.name,
      },
    },
    200,
    headers,
  );
});

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  clientInterceptors: [onError(reportProcedureError)],
});

const rpcHandler = new RPCHandler(appRouter, {
  clientInterceptors: [onError(reportProcedureError)],
});

app.use("/*", async (c, next) => {
  const context = await requestContext(c);

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  if (env.ENVIRONMENT !== "production") {
    const apiResult = await apiHandler.handle(c.req.raw, {
      prefix: "/api-reference",
      context: context,
    });

    if (apiResult.matched) {
      const response = c.newResponse(apiResult.response.body, apiResult.response);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return response;
    }
  }

  await next();
});

app.get("/", (c) => {
  return c.text("OK");
});

// Anything that escapes a route: HTTP errors keep their status, and only
// server faults reach error tracking.
app.onError((error, c) => {
  if (error instanceof HTTPException && error.status < 500) {
    return error.getResponse();
  }
  c.get("telemetry").captureException(error, {
    operation: `http.${c.req.method.toLowerCase()} ${c.req.routePath}`,
    handled: false,
    mechanism: "middleware",
  });
  if (error instanceof HTTPException) return error.getResponse();
  return c.json({ error: "Internal Server Error" }, 500);
});

const worker: ExportedHandler<Env> = {
  fetch: app.fetch,
  // Resolves audit intents whose outcome was never recorded. See alchemy.run.ts for the schedule.
  async scheduled(controller, _env, ctx) {
    const telemetry = workerTelemetry(ctx, {
      request_id: `cron-${controller.scheduledTime}`,
      cron: controller.cron,
    });
    try {
      await reconcileAuditedOperations({ telemetry });
    } catch (error) {
      telemetry.captureException(error, {
        operation: "cron.audit_reconciliation",
        handled: false,
      });
    }
  },
};

export default worker;
