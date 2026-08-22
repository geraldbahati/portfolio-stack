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
if (!secret) {
  console.error("Set SEED_ADMIN_SECRET (same secret as db:seed-admin).");
  process.exit(1);
}

const response = await fetch(`${serverUrl}/internal/seed-projects`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-seed-secret": secret,
  },
});

const body = await response.text();
if (!response.ok) {
  console.error(body);
  process.exit(1);
}

console.log(body);
