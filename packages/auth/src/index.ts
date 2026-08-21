import { createDb } from "@portfolio-stack/db";
import * as schema from "@portfolio-stack/db/schema/auth";
import { env } from "@portfolio-stack/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

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
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: cookies,
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
