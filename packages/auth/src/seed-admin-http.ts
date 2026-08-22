import { createDb } from "@portfolio-stack/db";
import { env } from "@portfolio-stack/env/server";
import { isAdminEnabled } from "./admin";
import { SeedAdminError, seedAdminUser } from "./seed-admin";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function handleSeedAdmin(request: Request) {
  if (!isAdminEnabled(env.ENABLE_ADMIN)) {
    return Response.json({ error: "admin disabled" }, { status: 403 });
  }

  const expected = env.SEED_ADMIN_SECRET;
  const provided = request.headers.get("x-seed-secret");
  if (!expected || !provided || provided !== expected) {
    return unauthorized();
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return Response.json({ error: "email and password are required" }, { status: 400 });
  }

  try {
    const result = await seedAdminUser(
      createDb(),
      {
        email: body.email,
        password: body.password,
        name: body.name,
      },
      env.ENVIRONMENT,
    );
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof SeedAdminError) {
      return Response.json({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }
}
