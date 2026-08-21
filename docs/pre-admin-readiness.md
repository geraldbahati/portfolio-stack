# Pre-admin readiness

This is the release gate for the public portfolio before the admin dashboard is built.

## Decisions already implemented

- Admin pages are protected in Astro middleware before page rendering. The web Worker forwards the request cookie to the API Worker's Better Auth session check; mutation procedures still enforce the admin allowlist independently.
- Sign-up remains disabled. Only the two reviewed addresses in `packages/auth/src/admin.ts` can pass the admin boundary, and `ENABLE_ADMIN=true` is also required.
- Starter Todo routes, public mutation procedures, UI, schema exports, and table are removed. Migration `0004_wandering_lord_tyger.sql` drops the old table without rewriting applied migration history.
- The OpenAPI reference is available in non-production environments only.
- Private routes are `private, no-store` and emit `X-Robots-Tag: noindex, nofollow, noarchive`. `robots.txt`, the XML sitemap, and a minimal standards-based web manifest are present.
- `llms.txt` is intentionally omitted. It is a community proposal, not a W3C or IETF standard.
- Playwright smoke tests cover static public routes, console/page errors, WCAG A/AA automation, keyboard skip navigation, reduced-motion emulation, mobile overflow, robots, and the manifest.

## Staging environment

Use a separate Alchemy stage and separate Cloudflare resources. Do not point staging at the production D1 database, R2 bucket, Resend webhook, or analytics project.

1. Set `ENVIRONMENT=staging`, a unique `BETTER_AUTH_SECRET`, and `ENABLE_ADMIN=false` for the first deploy.
2. Set `CORS_ORIGIN` to the exact staging web origin. Avoid wildcards when credentials are enabled.
3. Set `BETTER_AUTH_URL` to the staging API origin. Leave `AUTH_COOKIE_DOMAIN` blank unless web and API deliberately share a parent domain; if set, scope it to that parent only.
4. Configure staging Turnstile keys, a Resend test sender/recipient, a separate webhook signing secret, and separate Sentry/PostHog projects.
5. Apply all D1 migrations in order, seed the admin account through the guarded seed workflow, then rotate or remove the seed secret.
6. Set `ENABLE_ADMIN=true`, sign in, and confirm a non-allowlisted account receives a forbidden/not-found response.
7. Submit one contact request. Confirm Turnstile validation, the D1 record, the email, and a verified Resend webhook event. Replay the event once to confirm idempotent handling.
8. Confirm Cloudflare Stream video playback, poster/image transforms, the R2 custom domain, and cache headers from a cold browser profile.
9. Run `E2E_BASE_URL=https://staging.example.com bun run test:e2e` and `bun run verify:deployment -- https://staging.example.com https://api.staging.example.com`.

## Production gate

- `bun install --frozen-lockfile`
- `bun run check`
- `bun run test:e2e`
- production Worker build succeeds with the same compatibility date and `nodejs_compat` settings used in staging
- D1 backup/export exists before applying a new migration
- API reference returns 404; `/admin` redirects before HTML is rendered; private responses are not cached or indexed
- public pages, canonical URLs, sitemap URLs, manifest, structured data, consent choices, analytics opt-out, contact delivery, and legal copy have been checked on the production hostname
- field Core Web Vitals are monitored at the 75th percentile: LCP at or below 2.5 s, INP at or below 200 ms, and CLS at or below 0.1
- the intentionally deferred `hls.js` chunk is absent from initial requests and loads only when a project video needs it

## Official references

- [Astro middleware](https://docs.astro.build/en/guides/middleware/)
- [Astro endpoints](https://docs.astro.build/en/guides/endpoints/)
- [Astro on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)
- [Better Auth with Hono](https://www.better-auth.com/docs/integrations/hono)
- [Better Auth sessions](https://www.better-auth.com/docs/concepts/session-management)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Resend webhook verification guidance](https://resend.com/docs/webhooks/ingester)
- [Google robots meta and `X-Robots-Tag`](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Robots Exclusion Protocol (RFC 9309)](https://www.rfc-editor.org/rfc/rfc9309)
- [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/)
- [Playwright web server configuration](https://playwright.dev/docs/test-webserver)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
