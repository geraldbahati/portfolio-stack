import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { sentryOptions } from "@portfolio-stack/analytics/sentry";
import { createContext } from "@portfolio-stack/api/context";
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
import * as Sentry from "@sentry/cloudflare";
import type { Context as HonoContext } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { handleAdminMediaPreview, handleAdminMediaUpload } from "./admin-media";
import { handleResendWebhook } from "./webhooks";

const app = new Hono();
const trustedOrigins = parseTrustedOrigins(env.CORS_ORIGIN);

app.use("/*", async (c, next) => {
  const startedAt = performance.now();
  try {
    await next();
  } finally {
    // Cloudflare indexes object fields directly. Keep the request target to
    // the path only so query parameters and message contents cannot leak.
    console.log({
      event: "http_request",
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: Math.round(performance.now() - startedAt),
      ray_id: c.req.header("cf-ray") ?? null,
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
      "sentry-trace",
      "baggage",
      "x-seed-secret",
      "x-media-folder",
      "x-media-filename",
      "x-media-alt",
    ],
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

async function getAdminActor(c: HonoContext) {
  const context = await createContext({ context: c });
  const user = context.session?.user;
  if (!user) return { ok: false as const, error: "Unauthorized" as const, status: 401 as const };
  if (!isAdminEnabled(env.ENABLE_ADMIN) || !isAllowedAdminEmail(user.email, env.ENVIRONMENT)) {
    return { ok: false as const, error: "Forbidden" as const, status: 403 as const };
  }
  return { ok: true as const, user };
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
  return handleAdminMediaUpload(c.req.raw, actor.user.email);
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

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

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

export default Sentry.withSentry(
  (workerEnv: { SENTRY_DSN?: string; ENVIRONMENT?: string }) =>
    sentryOptions(workerEnv.SENTRY_DSN, workerEnv.ENVIRONMENT ?? "development"),
  app,
);
