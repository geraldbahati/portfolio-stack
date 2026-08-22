# Code structure

How this repo is organised, and the rules that keep it that way.

The failure mode this document exists to prevent: with no written convention,
each new feature copies whatever was nearest, and the codebase ends up with
four different answers to the same question. That is how the pre-refactor tree
got a `site-settings.ts`, a `settings.ts`, and a `settings/` directory all
describing one feature.

## Layout

```
apps/
  web/      Astro SSR site — public portfolio + admin
  server/   Hono worker — auth, oRPC, webhooks
packages/
  api/      oRPC routers, procedures, domain slices
  db/       Drizzle schema, data access, seeds
  auth/     Better-Auth factory, admin allowlist
  env/      typed env for server + web
  analytics/ PostHog, Sentry, consent
  media/    Cloudflare Stream / R2 / Images URL logic
  infra/    alchemy.run.ts — the source of truth for bindings
  config/   shared tsconfig base
```

`apps/` are thin deployable units. `packages/` hold the logic. Anything a
single app uses stays in that app until a second consumer appears — colocate
first, extract later.

## apps/web/src

```
features/     one directory per route feature or page section
components/   genuinely cross-feature UI only
layouts/      page shells
pages/        routes — thin; Astro reserves this name
lib/          shared logic, grouped by concern
styles/       global and admin stylesheets
```

### features/

A feature owns everything for one area of the site. Astro only reserves
`src/pages/`; this repository deliberately uses feature colocation for the
remaining source because it keeps markup, behaviour, styles, and pure logic
inside one change boundary. The internal shape:

```
features/hero-bio/
  HeroBio.astro   Hero.astro   Bio.astro    markup
  copy.ts                                   all user-facing strings
  hero-bio.css                              styles
  boot.ts                                   eager, minimal
  enhance.ts                                idle-deferred, bails on reduced-motion
  timeline.ts  fallback.ts                  pure logic
  copy.test.ts                              tests next to the pure parts
```

Not every feature needs every file. The rule is that when a file exists, it has
that name and that job.

**`boot.ts` / `enhance.ts` is a performance budget expressed as file layout.**
`boot.ts` runs immediately and stays small; it defers `enhance.ts` behind
`requestIdleCallback`. `enhance.ts` checks `prefers-reduced-motion` first and
dynamic-imports anything heavy. Keep it that way — it is why the site is fast.

A directory named `<thing>-page` implements a whole route; a directory named
`<thing>` is a section composed into a page. Both live here because both are
features.

Route files still own routing, route parameters, top-level data loading, and
page metadata. They delegate feature markup and behaviour so `src/pages/`
remains an index of routes instead of a second component directory.

### components/

Only for UI used by more than one feature. A component used by exactly one
feature belongs in that feature.

When a component grows companion files, give it a directory:

```
components/navbar/
  Navbar.astro   chrome.ts (behaviour)   delays.ts (its stagger timings)

components/project-card/
  ProjectCard.astro   project-card.css
```

### lib/

Grouped by concern. No loose files unless nothing groups with them.

| Directory | Holds |
|---|---|
| `lib/http/` | response policy — cache headers, security headers |
| `lib/seo/` | `site.ts` (identity constants, `canonicalUrl`), `page-copy.ts`, `json-ld.ts` |
| `lib/data/` | anything that talks to the server — orpc, auth-client, loaders |
| `lib/images/` | image presets, remote-image URLs, the generated manifest |
| `lib/motion/` | DOM effects — scramble, grid pattern, deferred media |
| `lib/project-media/` | project video/poster logic |
| `lib/admin/` | admin-only helpers |

`lib/navigation.ts` sits flat because nothing else groups with it. That is
allowed; inventing a one-file directory is not.

### styles/

`global.css` contains shared public-site foundations. Feature-specific public
styles stay with their feature. Admin styles live in `styles/admin/` as ordered
partials.

> **`styles/admin/` imports are order-dependent.** They were split from a single
> 2,198-line file and the import order in `AdminLayout.astro` reproduces the
> original cascade exactly. Do not reorder them. Adding a new partial is fine —
> append it, or place it deliberately.

The public site colocates CSS inside each feature. Admin does not yet. Moving
admin CSS into per-view files is a reasonable follow-up, but it must be done one
view at a time with a visual check, because the cascade is currently proven only
as a whole.

## packages/

### Vertical slices

A package feature owns its whole slice. `packages/api/src/contact/` is the
reference: schema, submit, email, resend, gate, turnstile, and a public
`index.ts`, all in one directory.

Group by feature when a feature has real logic. Group by layer only when the
layer is genuinely thin — `api/src/routers/` is one file per oRPC router and
that is all it is.

Large nested namespaces use a composing directory. `routers/admin/index.ts`
preserves the `admin.*` client API while activity, media, messages, projects,
and settings each own their procedure definitions in a focused module.

Do not use filename prefixes as pretend directories. `admin-messages.ts`,
`admin-projects.ts`, `admin-activity.ts` should be — and now are — `admin/messages.ts`,
`admin/projects.ts`, `admin/activity.ts`.

### Public API

Every package declares an explicit `exports` map in `package.json`. **No
wildcards.** `"./*": "./src/*.ts"` makes every internal file public and turns the
package boundary into decoration.

Adding a new entry point is a deliberate act: add the path to `exports`. If that
feels like friction, it is working — it is the moment to ask whether the
consumer should be importing that file at all.

Apps import package public APIs, never deep internals that the map does not name.

Configuration entry points count as public APIs too. The shared TypeScript
configuration and Alchemy environment type source are exposed as explicit
subpaths rather than relying on unrestricted package-directory access.

### Naming

One noun per feature, everywhere it appears. Before adding a file, grep for the
feature name; match what is already there rather than inventing a synonym.

Where a data-layer name and a transport-layer name legitimately differ, the
data layer uses the domain noun and the router file uses the RPC key — for
example `db/site-settings.ts` (matching the `site_settings` table) alongside
`api/routers/settings.ts` (matching the `settings` RPC namespace). That is a
rule, not an accident; do not add a third spelling.

File casing: `.ts` is kebab-case. `.astro` components are PascalCase. `.astro`
pages are lowercase, because page filenames become URLs.

## Adding things

**A new page section** — new directory in `features/`, follow the shape above.

**A new admin view** — page in `pages/admin/`, partial in `styles/admin/`,
shared helpers in `lib/admin/`.

**A new shared helper** — put it in the feature that needs it. Move it to `lib/`
on the second consumer, into the group it belongs to.

**A new package export** — add the explicit path to that package's `exports` map.

**A new package** — only when two apps need it. One consumer means it stays where
it is.

## Verifying a structural change

```bash
bun run lint && bun run check-types && bun run test && bun run build
```

`build` matters most for moves: it exercises the vite image plugin and every CSS
import, which type-checking alone does not.

## References

- [Astro project structure](https://docs.astro.build/en/basics/project-structure/)
- [Astro pages](https://docs.astro.build/en/basics/astro-pages/)
- [Astro layouts](https://docs.astro.build/en/basics/layouts/)
- [Node.js package entry points](https://nodejs.org/api/packages.html#package-entry-points)
- [oRPC routers](https://orpc.unnoq.com/docs/router)
- [Biome `noDescendingSpecificity`](https://biomejs.dev/linter/rules/no-descending-specificity/)
