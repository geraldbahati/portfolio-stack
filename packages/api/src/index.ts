import { ORPCError, os } from "@orpc/server";
import { isAdminEnabled, isAllowedAdminEmail } from "@portfolio-stack/auth/admin";
import type { AuditActor } from "@portfolio-stack/db/audit";
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

  // Derived once from the session already loaded for this request, so audit
  // writes never need another lookup to know who acted.
  const actor: AuditActor = {
    id: context.session.user.id,
    email: context.session.user.email,
    requestId: context.requestId,
  };

  return next({
    context: {
      session: context.session,
      actor,
    },
  });
});

export const adminProcedure = publicProcedure.use(requireAdmin);
