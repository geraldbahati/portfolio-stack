# Observability

PostHog EU carries both error tracking and consent-gated product analytics. Cloudflare Workers Logs and Traces carry request logs and sampled traces. There is no other telemetry vendor.

| Surface | Destination | Behaviour |
| --- | --- | --- |
| API Worker errors | PostHog error tracking | Unexpected failures captured once, named by operation, with request and actor IDs. |
| Web Worker errors | PostHog error tracking | Render, admin-session, and public-data failures; same configuration as the API. |
| Browser errors | `/monitoring` → PostHog | Essential reporting for every visitor, through a validated same-origin relay. |
| Browser analytics | `/gbx` → PostHog | Starts only after analytics consent. |
| Server events | PostHog | Specific operational events, sent after the response. |
| Request logs, traces | Cloudflare | Structured JSON logs with `request_id`; traces sampled at 10%. |

## Error tracking

All server-side capture goes through `createServerTelemetry` in `@portfolio-stack/analytics/server`. Both Workers configure it identically: project token, EU host, `service` (`api`, `web`, or `browser` for relayed reports), `environment`, and `release` (the deployed Worker version from the `CF_VERSION_METADATA` binding).

**What is reported.** Server faults only. The oRPC interceptor drops `ORPCError`s below 500 (validation, authentication, authorization, not-found, rate limits). Contact submissions report provider and configuration failures, never validation, Turnstile, or quota outcomes. Each error object is reported at most once, even if it is rethrown through several layers.

**What is attached.** An `operation` name (`rpc.admin.projects.update`, `contact.send_inquiry`, `web.render /projects/[slug]`), `request_id` (Cloudflare's ray ID, also returned as `X-Request-Id`), `actor_id` (the user ID, never the email), and IDs such as `submission_id` and `operation_id`. Server-side events disable person profiles and GeoIP.

**What is removed.** One normaliser (`error-tracking/normalize.ts`) shapes every exception, in the browser before sending and again in the `/monitoring` relay, so a stale or hostile client cannot bypass it. URLs inside messages get the page-URL allowlist. Credential assignments (`token=`, `password:`, `api_key=`…), bearer tokens, JWTs, and email addresses become placeholders. Frame locations lose their query, fragment, and credentials (an inline script's frame carries the full page URL). Every string is bounded, frames are capped at 50 and the cause chain at 5, and frame variables are never collected.

**Delivery.** Events are sent with `waitUntil` after the response, in a single request with a 3-second timeout. Telemetry never throws into, or delays, the request it observes. Every captured exception is also written to Workers Logs as a structured `exception` record, so failures stay visible if PostHog is unreachable.

**Browser.** `installBrowserErrorReporter` adds two listeners. The stack parser (`@posthog/core` error tracking) is a separate chunk loaded on the first error. A report is a duplicate only when error type, message, the parsed frame it was thrown from, and operation all match, so the same message from two call sites is reported twice. Reports are capped at ten per page, ignore extension and cross-origin noise, and are posted to `/monitoring`. If the relay rejects a report (400), it is resent once without stack traces, so the failure is still counted. Without analytics consent the reporter uses an ephemeral per-page identifier and stores nothing. With consent, it links to the PostHog session.

**Source maps.** When `POSTHOG_CLI_API_KEY` and `POSTHOG_CLI_PROJECT_ID` are set, the production build generates hidden source maps for the browser bundle only, and `@posthog/rollup-plugin` injects a chunk ID (and release ID) into each chunk. It uploads the maps under the `portfolio-web` release, versioned by the git commit, and deletes them. A final build step removes any map Astro left behind, so maps are never served. `bun run build` (the verification build) never uploads. Browser reports carry `$release_id` and per-frame `chunk_id`, which PostHog uses to show original source. The Worker bundles are not minified and are not uploaded.

**The `/monitoring` relay** accepts only a strict, bounded `$exception` report schema and supplies the token, event name, environment, and release itself, so it cannot relay anything else. In order, it rejects a wrong content type, a declared size over 64 KiB, and clients over the `MONITORING_RATE_LIMIT` (20 per minute per IP). Only then does it stream the body under the same byte limit. Accepted reports are re-scrubbed and forwarded after a `202`.

## Privacy filtering

`sanitizeUrl` keeps the origin, the path, and allowlisted query parameters (`utm_*`, `ref`, `page`, `category`). It drops credentials and fragments, and reduces non-HTTP destinations such as `mailto:` to their scheme. `scrubUrlProperties` applies it to a fixed list of URL-bearing properties, including `$current_url`, the referrers, the session entry URL, the `$set`/`$set_once` initial URLs, and explicit link `destination`s. It applies at three points: when the browser SDK sends an event (`before_send`), in the event dispatcher, and server-side on every relayed or captured event.

## Analytics events

Explicit portfolio events are dispatched through `@portfolio-stack/analytics/events`. Before the SDK loads, events are queued only if the visitor has accepted analytics, up to 50 of them. Rejecting analytics clears the queue. When the SDK loads, it replays the queue with the original timestamps. Card impressions are marked as viewed only once recorded, so an impression seen before consent is retried on a later sighting.

PostHog session recording, autocapture, and SDK exception autocapture stay disabled. Errors come only from the reporter above, so each is captured exactly once.

## Audit trail

`audit_log` records `actor_id`, `request_id`, `operation_id`, and an `outcome`. Database mutations write their audit row inside the same D1 batch. External operations (Stream deletion, R2 upload and deletion) use `runAuditedOperation`:

1. Write a `pending` intent. If this fails, the operation is not attempted.
2. Run the operation. If the provider definitively rejected it (a 4xx other than 408), record `failed`. If the outcome is ambiguous (a timeout, network failure, 5xx, or an R2 binding error), leave the intent pending, because the provider may have completed the work before the response was lost. Either way, rethrow.
3. Record `succeeded`. If only this write fails, the request still succeeds and the write failure is reported.

A cron trigger (every 15 minutes) runs `reconcileAuditedOperations`. It checks intents older than ten minutes against Stream or R2, records the real outcome, and gives up after 24 hours with `reason: unverifiable`. Sign-in successes and failures are audited from a Better Auth hook. Failures record the attempted address and a reason category, never the password.

The activity view pages by `(created_at, id)` keysets, filters by Nairobi calendar dates, and counts matches only on request. Search also matches operation and request IDs exactly, which joins an audit row to its PostHog exceptions and Workers Logs.

## Production variables

```dotenv
# apps/server/.env
POSTHOG_PROJECT_KEY=<posthog-project-token>
POSTHOG_HOST=https://eu.i.posthog.com

# apps/web/.env
PUBLIC_POSTHOG_KEY=<same-posthog-project-token>
PUBLIC_POSTHOG_HOST=/gbx

# Build-only, in the deployment environment
POSTHOG_CLI_API_KEY=<personal-api-key: error tracking write, organization read>
POSTHOG_CLI_PROJECT_ID=<numeric-project-id>
POSTHOG_CLI_HOST=https://eu.posthog.com
```

The project token is a write-only public identifier. The personal API key is a secret, used only while building. Never prefix it with `PUBLIC_`, and rotate it if it is exposed. The preflight requires both values to name the same EU project, and warns about any leftover `SENTRY_*` variables.

## Verification

1. Run `bun run release:check`, then confirm the production build logs a successful source-map upload and that no `.map` files are deployed.
2. Load the production site, accept analytics, open a project, and confirm the page view and the explicit project event in PostHog Live Events.
3. Run `throw new Error("monitoring check")` from a `setTimeout` in the browser console. Confirm a `/monitoring` request returns `202` and the exception appears under Error tracking with `service = browser`, the deployed `release`, and readable original source.
4. Trigger a controlled server failure, e.g. a temporary procedure that throws. Confirm the issue carries `operation`, `request_id`, and `environment`, then remove the code.
5. Decline analytics in a clean browser profile and confirm no `/gbx` request is made. `/monitoring` may still be used, as described in the privacy policy.
6. In the admin activity view, confirm sign-ins are listed and a media deletion shows an `In progress` row followed by `Succeeded`.

Do not add contact-form values, email addresses, passwords, tokens, message bodies, or full query strings to analytics or error context.
