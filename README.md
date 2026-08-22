# portfolio-stack

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Astro, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Astro** - The web framework for content-driven websites
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM.

Runtime database access uses the Cloudflare `DB` binding from `packages/infra/alchemy.run.ts`. If a local `DATABASE_URL` is present, it is only for database tooling.

Alchemy provisions the D1 database and applies migrations during `deploy`.

1. Generate migration files:

```bash
bun run db:generate
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Deployment

### Alchemy

- Target: web on Cloudflare + server on Cloudflare
- Configure provider login: `cd packages/infra && bunx alchemy login --configure`
- Dev: bun run dev
- Production verification: `bun run release:check`
- Production deploy: `bun run deploy:production`
- Destroy: bun run destroy

`alchemy login --configure` stores the selected Cloudflare, Neon, PlanetScale, and/or Prisma provider profiles under `~/.alchemy`; no provider-specific setup command is required by this scaffold.

Deploys are staged and default to a personal `dev_<username>` stage. The production command runs the secret-safe environment preflight first and then targets the explicit `production` stage:

```bash
bun run deploy:production
```

Follow the complete recovery, migration, smoke-test, and rollback procedure in [the production runbook](docs/production-readiness.md).
Sentry and PostHog configuration and verification are documented in [the observability guide](docs/observability.md).

### Production origins

- Before the first production deploy, set `CORS_ORIGIN` to the exact canonical HTTPS web origin. Wildcards, paths, HTTP origins, and redirect-only hostnames fail the production preflight.

## Project Structure

```
portfolio-stack/
├── apps/
│   ├── web/         # Frontend application (Astro)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run release:check`: Run the complete local production gate
- `bun run preflight:production`: Validate production configuration without printing secrets
- `bun run verify:deployment -- <web-url> <api-url>`: Run read-only production smoke checks
- `bun run db:generate`: Generate database client/types
