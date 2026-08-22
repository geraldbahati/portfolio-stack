# portfolio-stack

The source for [www.geraldbahati.dev](https://www.geraldbahati.dev) — a portfolio and case-study site, plus the admin dashboard that edits it.

Everything runs on Cloudflare: two Workers, a D1 database, an R2 bucket, KV, Images, and Stream. There is no origin server and no container.

## Architecture

Two Workers own separate concerns and are deployed together.

```
                      ┌──────────────────────────────┐
  visitor ──────────► │  web Worker (Astro, SSR)     │
                      │  www.geraldbahati.dev        │
                      └──────────────┬───────────────┘
                                     │ oRPC over HTTP
                      ┌──────────────▼───────────────┐
                      │  API Worker (Hono + oRPC)    │
                      │  portfolio-api.…dev          │
                      └──────┬───────────────┬───────┘
                             │               │
                      ┌──────▼─────┐   ┌─────▼──────┐
                      │  D1 (SQL)  │   │  R2 media  │
                      └────────────┘   └────────────┘
```

The web Worker renders every page server-side and never talks to the database
directly — all data crosses the oRPC boundary, so the API stays the single
place where authorisation is enforced. Admin routes are gated in Astro
middleware *before* rendering, and every admin procedure re-checks the
allowlist independently rather than trusting that the page guard ran.

Media is not migrated or proxied: images live in R2 behind
`media.geraldbahati.dev` and videos in Cloudflare Stream, both referenced by
absolute URL.

## Stack

| Concern | Choice |
| --- | --- |
| Web | Astro (SSR) on Cloudflare Workers |
| API | Hono + oRPC |
| Database | Cloudflare D1 with Drizzle |
| Auth | Better Auth, allowlisted admin |
| Media | R2, Cloudflare Images, Cloudflare Stream |
| Email | Resend, with signed delivery webhooks |
| Infrastructure | Alchemy (TypeScript, not YAML) |
| Monorepo | Turborepo + Bun workspaces |
| Tests | Vitest (unit), Playwright (end to end) |
| Observability | Sentry, PostHog (consent-gated) |

## Layout

```
apps/
  web/         Astro site: public pages, case studies, admin dashboard
  server/      Hono API Worker: oRPC routers, webhooks, media upload
packages/
  api/         oRPC routers and request/response schemas
  auth/        Better Auth setup and the admin allowlist
  db/          Drizzle schema, migrations, seeds
  media/       R2 helpers and upload validation
  analytics/   PostHog and Sentry configuration
  env/         Validated environment access
  infra/       Alchemy stack definition
  config/      Shared TypeScript and tooling config
```

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
```

Copy each `.env.example` to `.env` and fill it in — `apps/server/.env` for
runtime credentials and `apps/web/.env` for public build values. Then:

```bash
bun run dev
```

This starts both Workers locally through Alchemy, with D1, R2, and KV emulated
on disk. The site is on `http://localhost:4321` and the API on `http://localhost:3000`.

## Commands

```bash
bun run check              # lint, typecheck, unit tests
bun run test               # unit tests only
bun run test:e2e           # Playwright, starts its own dev server
bun run db:generate        # generate a migration from schema changes
bun run preflight:production   # audit production config (prints no secrets)
bun run release:check      # every gate, in order — run before deploying
```

## Deploying

Read [the production runbook](docs/production-readiness.md) first; it covers
the release order, the D1 recovery point, and the checks that follow a deploy.

```bash
bun run release:check
bun run deploy:production
```

Alchemy applies pending migrations from `packages/db/src/migrations` as part of
the deploy. Do not run a separate migration command.

## Documentation

- [Production runbook](docs/production-readiness.md) — release procedure, configuration, rollback
- [Code structure](docs/code-structure.md) — how the packages fit together and why
- [Admin architecture](docs/admin-architecture.md) — the dashboard's boundaries and data flow
- [Observability](docs/observability.md) — Sentry, PostHog, and consent behaviour

## License

See [LICENSE](LICENSE). The written case studies, photography, and the GB mark
are not covered by it and remain all rights reserved.
