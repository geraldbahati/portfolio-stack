#!/usr/bin/env bun

import { config } from "dotenv";

import { validateProductionEnvironment } from "../packages/infra/src/production-readiness";

for (const path of [".env.production.local", ".env", "apps/server/.env", "apps/web/.env"]) {
  config({ path, quiet: true });
}

const issues = validateProductionEnvironment(process.env);
const errors = issues.filter((issue) => issue.severity === "error");

for (const issue of issues) {
  const label = issue.severity === "error" ? "ERROR" : "WARN";
  const output = `${label} ${issue.key}: ${issue.message}`;
  if (issue.severity === "error") console.error(output);
  else console.warn(output);
}

if (errors.length > 0) {
  console.error(`\nProduction preflight failed with ${errors.length} configuration error(s).`);
  process.exit(1);
}

console.log("\nProduction preflight passed.");
