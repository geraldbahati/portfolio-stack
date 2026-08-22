# Security policy

## Reporting a vulnerability

Report suspected vulnerabilities privately to **hello@geraldbahati.dev**, or
through GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository.

Please do not open a public issue for a security problem.

Include what you did, what you observed, and how severe you believe it is. A
proof of concept helps but is not required. Expect an acknowledgement within a
few days.

## Scope

In scope: the two Workers in `apps/`, the shared packages in `packages/`, and
the deployed site at `www.geraldbahati.dev` and `portfolio-api.geraldbahati.dev`.

Out of scope: findings against Cloudflare, Resend, Sentry, or PostHog
themselves — report those to the relevant vendor. Also out of scope are
missing headers with no demonstrated impact, and automated scanner output
without a working exploit.

Please do not run denial-of-service tests, brute-force credentials, or submit
bulk traffic through the contact form.

## Handling

Secrets are held in git-ignored environment files and Cloudflare's secret
store; none are committed. `bun run preflight:production` audits production
configuration and reports variable names and rules only, never values.
