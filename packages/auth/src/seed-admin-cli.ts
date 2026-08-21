#!/usr/bin/env bun

import { config } from "dotenv";

config({ path: "apps/server/.env" });
config({ path: "apps/web/.env" });

const serverUrl = (
  process.env.BETTER_AUTH_URL ??
  process.env.PUBLIC_SERVER_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const secret = process.env.SEED_ADMIN_SECRET;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME;

if (!secret || !email || !password) {
  console.error(
    "Set SEED_ADMIN_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD (ENABLE_ADMIN=true on the server).",
  );
  process.exit(1);
}

const response = await fetch(`${serverUrl}/internal/seed-admin`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-seed-secret": secret,
  },
  body: JSON.stringify({ email, password, name }),
});

const body = await response.text();
if (!response.ok) {
  console.error(body);
  process.exit(1);
}

console.log(body);
