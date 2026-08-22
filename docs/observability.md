# Sentry and PostHog observability

The portfolio separates operational error monitoring from optional product analytics.

| Surface | Service | Behaviour |
| --- | --- | --- |
| Web and API Workers | Sentry | Captures errors and sampled traces without default PII. Sensitive query parameters are removed. |
| Browser | Sentry | Loads asynchronously in production and sends envelopes through the same-origin `/monitoring` tunnel. |
| Browser | PostHog EU | Starts only after analytics consent and uses the same-origin `/gbx` proxy. |
| Server events | PostHog EU | Sends specific operational events without creating person profiles. |

PostHog session recording, exception capture, and automatic element capture are intentionally disabled. Sentry owns error reporting; PostHog receives page views, Core Web Vitals, and the explicit portfolio interaction events.

## Production variables

Configure these in the scoped environment files used by Alchemy. The PostHog project token and Sentry DSN are public routing identifiers; the Sentry auth token is a secret.

```dotenv
# apps/server/.env
SENTRY_DSN=<sentry-project-dsn>
POSTHOG_PROJECT_KEY=<posthog-project-token>
POSTHOG_HOST=https://eu.i.posthog.com

# apps/web/.env
PUBLIC_SENTRY_DSN=<same-sentry-project-dsn>
SENTRY_DSN=<same-sentry-project-dsn>
SENTRY_AUTH_TOKEN=<secret-source-map-upload-token>
SENTRY_ORG=<organization-slug>
SENTRY_PROJECT=<project-slug>
PUBLIC_POSTHOG_KEY=<same-posthog-project-token>
PUBLIC_POSTHOG_HOST=/gbx
```

`SENTRY_AUTH_TOKEN` is used only while building to upload source maps. Create an organization token with the minimum project/release access requested by Sentry's source-map setup, store it only in the deployment environment, and rotate it if it is ever exposed. Never prefix it with `PUBLIC_`.

The `/monitoring` endpoint accepts an envelope only when its DSN exactly matches `PUBLIC_SENTRY_DSN`, has a Sentry Cloud ingestion hostname, and stays under the configured size limit. This prevents the tunnel from becoming an arbitrary relay.

## Verification

1. Run `bun run release:check`. The production preflight verifies matching browser/server projects, EU PostHog routing, the first-party proxy, and all Sentry source-map settings.
2. Confirm the production build reports a successful Sentry source-map upload.
3. Load the production site, accept analytics, navigate to a project, and confirm the page view and explicit project event appear in PostHog Live Events.
4. Trigger a controlled test exception, confirm it appears in the correct Sentry environment with readable source context, then remove the test code.
5. Decline analytics in a clean browser profile and confirm no `/gbx` request is made. Sentry operational envelopes may still use `/monitoring` as described in the privacy policy.

Do not add contact-form values, email addresses, passwords, tokens, message bodies, or full query strings to analytics or error context.
