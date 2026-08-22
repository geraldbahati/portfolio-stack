# Admin architecture

Production deployment, bootstrap, backup, smoke-test, and rollback operations are documented in [the production readiness runbook](./production-readiness.md).

The admin is an on-demand Astro application inside `apps/web`. It uses server-rendered HTML for
navigation, reads, and forms. Client JavaScript is not required for the admin shell, Projects,
Messages, Media browsing and deletion, or Settings. The Media upload form is the sole progressive
enhancement in those modules so the file body can stream directly from the browser to the API
Worker.

## Request flow

1. `apps/web/src/middleware.ts` intercepts every `/admin` request, including endpoint POSTs.
2. The middleware forwards only the session cookie to the server's `/internal/admin-session`
   endpoint.
3. The server validates the Better Auth session, `ENABLE_ADMIN`, and the hardcoded admin allowlist.
4. A validated admin identity is stored in request-scoped `Astro.locals.admin`.
5. Pages and endpoints use a request-scoped oRPC client that forwards the session cookie.
6. Every `admin.*` procedure repeats the session, feature flag, and allowlist checks before reading or
   mutating data.

Admin responses use `private, no-store` and `noindex, nofollow, noarchive`. Unauthorized page
requests redirect before any admin HTML renders. Unauthorized RPC requests return `401`.

## Module boundaries

- `apps/web/src/pages/admin`: page and form-endpoint routes.
- `apps/web/src/layouts/AdminLayout.astro`: the private document and responsive shell.
- `apps/web/src/components/admin`: reusable admin presentation components.
- `apps/web/src/lib/admin`: navigation, session parsing, and form-boundary helpers.
- `packages/api/src/routers/admin/`: domain-focused admin-only typed procedures composed by `index.ts`.
- `packages/api/src/admin`: mutation schemas and publication rules.
- `packages/db/src/admin*.ts`: admin queries and atomic audited writes.
- `packages/media/src/admin.ts`: image allowlists, immutable object keys, and public URL boundaries.

## Projects workflow

- `GET /admin/projects`: paginated search and publication-status filters.
- `GET /admin/projects/new`: create a private draft.
- `POST /admin/projects/create`: validate and create the project, details, and audit record atomically.
- `GET /admin/projects/[id]/edit`: edit core media, case-study content, and display settings.
- `POST /admin/projects/[id]/update`: validate and atomically update content plus its audit record.
- `POST /admin/projects/[id]/publication`: publish or unpublish after exact-slug confirmation.
- `GET /admin/projects/[id]/content`: edit metrics, challenges, gallery, testimonial, colors, and
  project relations.
- `POST /admin/projects/[id]/content/save`: validate and atomically replace or save one structured
  content section plus its audit record.

Publication is separate from saving. A project cannot publish without its summary, approved media
URL, alt text, tagline, full description, and at least one service. New projects always start as
drafts, slugs are immutable after creation, and destructive deletion is intentionally not part of
the initial workflow.

Repeatable case-study sections use explicit plain-text interchange formats so they remain editable
without client JavaScript. Metrics and gallery items use one pipe-delimited record per line;
challenges use Markdown blocks separated by `---`; colors use one `#RRGGBB | name` record per line.
The server parses and validates the entire section before replacing anything, so malformed input
cannot partially overwrite existing content. Clearing a populated metrics, challenges, or gallery
section requires exact-slug confirmation; testimonial removal uses the same confirmation rule.

## Messages workflow

- `GET /admin/messages`: paginated sender, email, and body search with inbox, archive, read-state,
  and delivery-state filters.
- `GET /admin/messages/[id]`: private message body, sender, provider delivery record, and retention
  controls.
- `POST /admin/messages/[id]/action`: explicitly mark read or unread, archive or restore, or
  permanently delete.

Opening a detail page does not mutate the record. Every state change uses a same-origin `POST`, then
redirects back to a `GET`; read and archive timestamps preserve operational context. Archive is
reversible and is not treated as deletion. Permanent deletion requires the exact submission ID and
atomically writes a minimal audit event that excludes the sender's name, email, and message body.

The UI provides manual review and secure deletion controls, but it does not invent an automatic
retention duration. The published privacy policy currently states a typical 2–3 year contact-form
period. Before scheduled deletion is introduced, that period should be confirmed as the actual
business requirement, assigned to an owner, and documented with the disposal method.

## Media workflow

- `GET /admin/media`: server-rendered, cursor-paginated R2 object listing with folder filters.
- `PUT /internal/admin-media/upload`: authenticated, same-origin-checked browser stream into the R2
  binding.
- `GET /internal/admin-media/object?key=…`: authenticated private preview streamed from R2.
- `POST /admin/media/delete`: same-origin form endpoint for exact-key-confirmed deletion.

Uploads accept AVIF, GIF, JPEG, PNG, and WebP images up to 25 MiB. SVG is intentionally excluded
because it can contain executable content. The server derives the extension from the validated
content type and creates an immutable `folder/YYYY/MM/name-id.ext` key; it never trusts a filename
extension or accepts a caller-selected object key. R2 stores the content type, immutable public
cache policy, original filename, and required alt text as object metadata.

The upload endpoint requires a known `Content-Length`, validates the browser origin and current
admin session, and sends the request `ReadableStream` directly to `R2.put()`. If its D1 audit write
fails, the newly written object is deleted before an error is returned. Deletion cannot be atomic
across D1 and R2, so it writes a minimal `media.delete.requested` audit record before deleting and a
completion record afterward. Neither audit path stores the image, alt text, or original filename.

Public URLs use the configured media origin, while previews remain authenticated and `no-store`.
Large video is outside this image-library contract and should use Cloudflare Stream or a dedicated
multipart workflow rather than passing through the Worker upload endpoint.

## Settings workflow

- `GET /admin/settings`: load the current public profile record or checked-in defaults.
- `POST /admin/settings/update`: validate and atomically save the singleton record plus its audit
  event.
- `settings.getPublic`: public typed read consumed by the shared Astro site layout.

The editable boundary is intentionally narrow: professional title, location, business hours,
availability text, and the five existing social profiles. Social values must be HTTPS URLs on the
matching network host; an empty field hides the network. Legal identity and policy text, canonical
domains, analytics, authentication, and deployment secrets remain code or environment managed.

The shared layout requests settings on the server with a 500 ms budget and falls back to checked-in
defaults on any timeout, validation error, or API failure. No settings JavaScript ships to the
browser. Public HTML remains edge cached, so the D1 read happens during page regeneration rather
than on every browser request. Updates store only changed field names in the audit metadata, not
the field contents.

## Activity workflow

- `GET /admin/activity`: read-only, paginated audit history with action, actor, and entity search
  plus bounded category filters.
- `admin.activity.list`: admin-only typed procedure backed by the existing creation-time and entity
  indexes.
- `admin.overview`: includes the six most recent lightweight audit events alongside project and
  message summaries.

The Activity UI never renders arbitrary metadata JSON. It recognizes a small allowlist—changed
field names, collection counts, media type and size, and project title—and ignores every other key.
The history has no edit or delete operation. Links are offered only for targets with a stable admin
destination; deleted contact records deliberately remain plain identifiers.

## Browser verification

Playwright runs local authenticated checks against a separate Alchemy `e2e` stage on ports 4421 and
3100. That stage has its own D1 data and enables a synthetic `e2e-admin@geraldbahati.dev` identity;
the same address is rejected by both the seed path and admin middleware outside
`ENVIRONMENT=test`. The setup project seeds the isolated admin and public project fixtures, signs in
through the real login UI, and stores the session under ignored `test-results` output. Playwright
cleans that state between runs.

The public project runs without the stored admin session and verifies anonymous access boundaries.
The authenticated project verifies automated WCAG A/AA checks, responsive overflow, project
creation/editing/structured content/publication, and the full contact-to-inbox read, archive,
restore, and deletion lifecycle. It also uploads a real PNG into the isolated R2 bucket, verifies
the authenticated preview, and permanently deletes the test object. Settings coverage rejects an
incorrect social host, publishes a changed title through the public footer, and restores the
default. Activity coverage verifies the resulting audit event, filtering, overview integration,
anonymous rejection, accessibility, and mobile layout. External deployment runs keep authenticated checks optional: set
`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, and `E2E_API_URL` to include them.

## Future modules

All reserved foundation modules are now interactive. Future work should extend an existing module
only after its public effect, authorization boundary, validation, audit behavior, and browser test
are defined.
