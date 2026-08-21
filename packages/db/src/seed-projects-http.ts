import { env } from "@portfolio-stack/env/server";

import { createDb } from "./index";
import { seedPublishedProjects } from "./seed-projects";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function handleSeedProjects(request: Request) {
  const expected = env.SEED_ADMIN_SECRET;
  const provided = request.headers.get("x-seed-secret");
  if (!expected || !provided || provided !== expected) {
    return unauthorized();
  }

  const result = await seedPublishedProjects(createDb());
  return Response.json(result, { status: 200 });
}
