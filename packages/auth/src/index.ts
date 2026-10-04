import { createDb } from "@portfolio-stack/db";
import { writeAuditLog } from "@portfolio-stack/db/audit";
import * as schema from "@portfolio-stack/db/schema/auth";
import { env } from "@portfolio-stack/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";

import { signInAuditRecord } from "./audit";
import { cookieAttributes, parseTrustedOrigins } from "./origins";

export { ADMIN_EMAILS, isAdminEnabled, isAllowedAdminEmail } from "./admin";
export { parseTrustedOrigins, streamAllowedOrigins } from "./origins";
export { handleSeedAdmin } from "./seed-admin-http";

export function createAuth() {
  const db = createDb();
  const trustedOrigins = parseTrustedOrigins(env.CORS_ORIGIN);
  const cookies = cookieAttributes(env.ENVIRONMENT, env.BETTER_AUTH_URL);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    rateLimit: {
      enabled: env.ENVIRONMENT === "production",
      window: 60,
      max: 100,
      storage: "database",
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const record = signInAuditRecord({
          path: ctx.path,
          returned: ctx.context.returned,
          newSession: ctx.context.newSession,
          body: ctx.body,
          headers: ctx.headers,
        });
        if (!record) return;

        // A security record is worth a short wait, but an audit outage must
        // never decide whether someone can sign in.
        try {
          await writeAuditLog(record.actor, record.entry, db);
        } catch (error) {
          console.error({
            event: "auth_audit_failed",
            action: record.entry.action,
            outcome: record.entry.outcome,
            request_id: record.actor.requestId,
            reason: error instanceof Error ? error.name : "unknown",
          });
        }
      }),
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: cookies,
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      ...(env.AUTH_COOKIE_DOMAIN
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: env.AUTH_COOKIE_DOMAIN,
            },
          }
        : {}),
    },
  });
}
