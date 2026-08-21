import type { createDb } from "@portfolio-stack/db";
import { account, user } from "@portfolio-stack/db/schema/auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import { isAllowedAdminEmail } from "./admin";

export type SeedAdminInput = {
  email: string;
  password: string;
  name?: string;
};

export class SeedAdminError extends Error {
  constructor(
    message: string,
    readonly code: "not_allowlisted" | "weak_password",
  ) {
    super(message);
    this.name = "SeedAdminError";
  }
}

export async function seedAdminUser(db: ReturnType<typeof createDb>, input: SeedAdminInput) {
  const email = input.email.trim().toLowerCase();
  if (!isAllowedAdminEmail(email)) {
    throw new SeedAdminError("Email is not on the admin allowlist", "not_allowlisted");
  }
  if (input.password.length < 12) {
    throw new SeedAdminError("Password must be at least 12 characters", "weak_password");
  }

  const existing = (await db.select().from(user).where(eq(user.email, email)).limit(1))[0];
  if (existing) {
    return { created: false as const, userId: existing.id, email };
  }

  const userId = crypto.randomUUID();
  const now = new Date();
  const password = await hashPassword(input.password);

  await db.insert(user).values({
    id: userId,
    name: input.name?.trim() || email.split("@")[0] || "Admin",
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password,
    createdAt: now,
    updatedAt: now,
  });

  return { created: true as const, userId, email };
}
