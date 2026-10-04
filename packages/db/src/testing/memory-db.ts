import { readdir, readFile } from "node:fs/promises";
import { URL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import type { createDb } from "../index";
import * as schema from "../schema";

type Database = ReturnType<typeof createDb>;

const migrationsDir = new URL("../migrations/", import.meta.url);

/**
 * An in-memory SQLite database with every migration applied in order, so
 * tests exercise the same schema and indexes D1 runs.
 */
export async function createMemoryDb() {
  const client = createClient({ url: ":memory:" });
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await client.executeMultiple(await readFile(new URL(file, migrationsDir), "utf8"));
  }
  const db = drizzle(client, { schema }) as unknown as Database;
  return { client, db };
}
