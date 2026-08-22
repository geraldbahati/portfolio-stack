# Production readiness and release runbook

This runbook is for the Astro web Worker, Hono API Worker, D1 database, and R2 media bucket declared in `packages/infra/alchemy.run.ts`.

## Why the release flow is structured this way

- Astro is built separately for each environment. This matches Astro's Cloudflare guidance because environment selection happens during the build. Hashed Astro assets receive long-lived caching automatically, while dynamic responses keep their explicit application cache policy.
- Production auth uses exact trusted origins, secure `SameSite=Lax` cookies shared only across the portfolio's parent domain, Cloudflare's trusted client IP header, and D1-backed Better Auth rate limiting.
- Production uses only the canonical custom domains. Alchemy disables both stable and preview `workers.dev` URLs once those domains are configured.
- `www.geraldbahati.dev` is the canonical web host. The bare apex is attached as an alias custom domain and permanently redirects in `apps/web/src/middleware.ts`, before rendering, authentication, or caching. Alchemy's `redirects` option would instead write a rule into the zone's dynamic-redirect phase, which needs zone ruleset credentials that Cloudflare's OAuth scopes do not grant; keeping the redirect in the Worker keeps it in code and under test. `ALIAS_HOSTS` in `apps/web/src/lib/seo/site.ts` is the single source of truth for which hosts redirect.
- Resend delivery events are verified against the untouched request body and all three Svix headers before any stored message status can change.
- Alchemy applies new ordered SQL files from `migrationsDir` during deployment and records applied files. Never edit a migration that has already reached a shared environment; generate a new one.
- D1 Time Travel is always enabled. Capture its current bookmark before a schema or data release so the recovery point is written into the release record.

Primary references:

- [Astro Cloudflare integration](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Astro security configuration](https://docs.astro.build/en/reference/configuration-reference/#security)
- [Better Auth security](https://www.better-auth.com/docs/reference/security)
- [Better Auth cookies](https://better-auth.com/docs/concepts/cookies)
- [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit)
- [Alchemy D1 migrations](https://alchemy.run/sql/effect-sql/migrations)
- [Alchemy custom domains](https://alchemy.run/cloudflare/networking/custom-domains)
- [Cloudflare D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Cloudflare Worker rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Sentry for Astro](https://docs.sentry.io/platforms/javascript/guides/astro/)
- [PostHog for Astro](https://posthog.com/docs/libraries/astro)

## Required production configuration

Use `.env.production.local` for production-only domains, auth configuration, and resource names. Keep provider-specific runtime credentials in `apps/server/.env` and build/public credentials in `apps/web/.env`. All three files are git-ignored; do not commit filled values. The production deploy command explicitly selects the production profile so ordinary local development keeps using development settings.

```dotenv
ENVIRONMENT=production
WEB_DOMAIN=www.geraldbahati.dev
WEB_REDIRECT_DOMAINS=geraldbahati.dev
SERVER_DOMAIN=portfolio-api.geraldbahati.dev
CORS_ORIGIN=https://www.geraldbahati.dev
AUTH_COOKIE_DOMAIN=geraldbahati.dev
ENABLE_ADMIN=true
ENABLE_ADMIN_SEED=false
BETTER_AUTH_SECRET=<at-least-32-random-characters>
PUBLIC_MEDIA_ORIGIN=https://media.geraldbahati.dev
PUBLIC_TURNSTILE_SITE_KEY=<site-key>
TURNSTILE_SECRET_KEY=<secret-key>
RESEND_API_KEY=<api-key>
RESEND_WEBHOOK_SECRET=<signing-secret>
SENDER_EMAIL=Gerald Bahati <contact@geraldbahati.dev>
RECIPIENT_EMAIL=contact@geraldbahati.dev
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_STREAM_API_TOKEN=<least-privilege-stream-token>
R2_BUCKET_NAME=portfolio-store
SENTRY_DSN=<sentry-project-dsn>
PUBLIC_SENTRY_DSN=<same-sentry-project-dsn>
SENTRY_AUTH_TOKEN=<secret-source-map-upload-token>
SENTRY_ORG=<organization-slug>
SENTRY_PROJECT=<project-slug>
POSTHOG_PROJECT_KEY=<posthog-project-token>
PUBLIC_POSTHOG_KEY=<same-posthog-project-token>
POSTHOG_HOST=https://eu.i.posthog.com
PUBLIC_POSTHOG_HOST=/gbx
```

Generate independent secrets; do not reuse a Cloudflare, Resend, or session secret:

```sh
openssl rand -base64 32
```

`R2_BUCKET_NAME` names a bucket that predates this stack and is shared with the site currently served from the apex. Alchemy reconciles a bucket's CORS and lifecycle rules to exactly what `packages/infra/alchemy.run.ts` declares, so those rules are declared there to mirror the live bucket. Removing them deletes the live browser read/upload policy and the multipart abort rule. Custom domains behave differently: only domains this stack previously created are removed, so `media.geraldbahati.dev` is unaffected.

`CLOUDFLARE_STREAM_API_TOKEN` is a least-privilege runtime token for the Stream API. It is not the credential Alchemy uses to deploy. Alchemy deployment credentials belong in its authenticated profile, created with `alchemy login`, rather than in application environment files. `R2_BUCKET_NAME` must explicitly identify the existing live media bucket; the preflight deliberately rejects an implicit default.

In Resend, register `https://portfolio-api.geraldbahati.dev/webhooks/resend` for the delivery events used by the app (`email.sent`, `email.delivered`, `email.bounced`, and `email.failed`). Copy that endpoint's signing secret into `RESEND_WEBHOOK_SECRET`. The endpoint returns an error when the secret is missing and cryptographically rejects missing, stale, or invalid signatures.

Follow [the observability guide](observability.md) for Sentry project/source-map credentials, consent-aware PostHog behaviour, and the live verification procedure.

Run the safe configuration audit before every production plan:

```sh
bun run preflight:production
```

The command reports variable names and rules only. It never prints secret values.

## Release procedure

### 1. Prepare and verify the exact revision

```sh
bun install --frozen-lockfile
bun run release:check
git diff --check
```

`release:check` runs lint, TypeScript, all unit tests, the production build, the full Playwright suite, and the secret-safe production preflight. It exits non-zero on the first failed gate.

Record the Git commit, operator, date, target domains, and expected migration filenames in the release ticket or log.

### 2. Capture the D1 recovery point

Find the production database name in the Cloudflare dashboard or with `wrangler d1 list`, then run:

```sh
bunx wrangler d1 time-travel info <database-name>
```

Copy the current bookmark into the release record before deploying. Time Travel retains minute-level history for the period provided by the account plan; consult the linked Cloudflare limits at release time.

### 3. Review and deploy the Alchemy plan

```sh
bun run deploy:production
```

The `deploy` and `destroy` Turbo tasks declare `PORTFOLIO_ENV` in `passThroughEnv`. Turbo runs in strict environment mode, so without that declaration the production profile selector is stripped and the deploy silently falls back to development configuration. Keep it declared.

#### Staged rollout onto an apex already serving another site

When the apex or `www` still points at a different live site, deploy the API hostname first and leave the public domains alone. Overriding the two web domain variables makes the Astro Worker deploy to `workers.dev` instead, and no apex or `www` DNS record is created or changed:

```sh
PORTFOLIO_ENV=production WEB_DOMAIN= WEB_REDIRECT_DOMAINS= bun run --cwd packages/infra deploy -- --stage production
```

Verify the API hostname, then run the unstaged `bun run deploy:production` to perform the apex and `www` cutover as a separate, deliberate release.

Read the plan before confirming. The D1 resource applies pending files from `packages/db/src/migrations` in order and stops on the first failure. Confirm that custom domains, secret bindings, D1, R2, and both Workers are changes you expect.

Do not run a second migration command: Alchemy owns migration application for this stack.

### 4. Run production smoke verification

Use the canonical HTTPS domains returned by the deployment:

```sh
bun run verify:deployment -- https://www.geraldbahati.dev https://portfolio-api.geraldbahati.dev
```

This is read-only. It checks public pages, headers, robots and manifest files, the server health response, allowed and hostile CORS origins, anonymous admin rejection, disabled bootstrap endpoints, public settings, and the production-only absence of the API reference.

Then manually confirm one authenticated admin session, one draft save, one publish/unpublish cycle on a disposable project, and one contact submission. Remove the disposable content afterward through the admin UI so the action is audited.

### 5. Observe before closing the release

Both Workers enable persisted invocation logs and a 10% trace sample. During the first release window, watch:

- 5xx and 429 rates;
- authentication failures and redirect loops;
- D1 query and migration errors;
- contact-delivery or Resend webhook failures;
- R2 upload failures and unexpected latency.

Do not log session cookies, seed secrets, passwords, Turnstile tokens, or message bodies.

## One-time admin bootstrap

The two seed endpoints return `404` unless `ENABLE_ADMIN_SEED=true`. Bootstrap is intentionally a short, two-deployment operation.

1. Set `ENABLE_ADMIN_SEED=true`, generate a unique `SEED_ADMIN_SECRET`, and provide `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` only in the operator environment.
2. Run `bun run preflight:production`, review the plan, and deploy.
3. Point the seed CLI at the canonical API Worker and run it once:

   ```sh
   BETTER_AUTH_URL=https://portfolio-api.geraldbahati.dev bun run db:seed-admin
   ```

4. Sign in and verify the account immediately.
5. Set `ENABLE_ADMIN_SEED=false`, remove `SEED_ADMIN_SECRET`, `ADMIN_PASSWORD`, and the other bootstrap-only values, then redeploy.
6. Run `verify:deployment`; it must confirm both seed endpoints return `404`.

Do not leave bootstrap access enabled between release windows.

## Rollback

### Application-only failure

Prefer reverting the faulty Git commit and deploying the resulting Alchemy plan so source, infrastructure state, and the live deployment stay aligned.

For an urgent outage, Cloudflare can immediately roll either Worker back to a prior version from **Workers & Pages → Worker → Deployments**, or with `wrangler rollback`. After service is stable, revert the source and run Alchemy again to reconcile declared and live state.

### Database or migration failure

Only restore D1 when the failure changed or corrupted data/schema and an application rollback is insufficient.

1. Stop or disable write paths.
2. Capture the current bookmark so the failed state remains recoverable.
3. Identify the pre-release bookmark recorded in step 2.
4. Restore it:

   ```sh
   bunx wrangler d1 time-travel restore <database-name> --bookmark=<pre-release-bookmark>
   ```

5. Deploy the code revision compatible with that schema.
6. Run the complete deployment verifier and inspect logs before re-enabling writes.

A D1 restore changes live production data. Have a second person verify the database name and bookmark before confirming it.

## Post-release record

Keep the following together:

- Git commit and Alchemy plan summary;
- D1 pre-release and post-release bookmarks;
- applied migration filenames;
- web and API Worker version IDs;
- smoke-verification output;
- bootstrap-disabled confirmation;
- incidents, rollback actions, and follow-up work.
