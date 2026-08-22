import { ORPCError, os } from "@orpc/server";
import { isAdminEnabled, isAllowedAdminEmail } from "@portfolio-stack/auth/admin";
import { env } from "@portfolio-stack/env/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireAdmin = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (!isAdminEnabled(env.ENABLE_ADMIN)) {
    throw new ORPCError("FORBIDDEN");
  }

  if (!isAllowedAdminEmail(context.session.user.email, env.ENVIRONMENT)) {
    throw new ORPCError("FORBIDDEN");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

export const adminProcedure = publicProcedure.use(requireAdmin);
