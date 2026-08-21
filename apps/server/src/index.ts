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
import { handleSeedProjects } from "@portfolio-stack/db/seed-projects-http";
import { env } from "@portfolio-stack/env/server";
import * as Sentry from "@sentry/cloudflare";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { handleResendWebhook } from "./webhooks";

const app = new Hono();
const trustedOrigins = parseTrustedOrigins(env.CORS_ORIGIN);

app.use(logger());
app.use(
  "/*",
  cors({
    origin: trustedOrigins,
    allowMethods: ["GET", "POST", "OPTIONS", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization", "sentry-trace", "baggage", "x-seed-secret"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

app.post("/internal/seed-admin", (c) => handleSeedAdmin(c.req.raw));
app.post("/internal/seed-projects", (c) => handleSeedProjects(c.req.raw));

app.post("/webhooks/resend", (c) => handleResendWebhook(c));

app.get("/internal/admin-session", async (c) => {
  const context = await createContext({ context: c });
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };

  if (!context.session?.user) {
    return c.json({ error: "Unauthorized" }, 401, headers);
  }

  if (!isAdminEnabled(env.ENABLE_ADMIN) || !isAllowedAdminEmail(context.session.user.email)) {
    return c.json({ error: "Forbidden" }, 403, headers);
  }

  return c.json(
    {
      user: {
        id: context.session.user.id,
        email: context.session.user.email,
        name: context.session.user.name,
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
