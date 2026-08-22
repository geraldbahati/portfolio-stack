/**
 * Per-isolate memo for public, visitor-independent data. Repeating the settings
 * and project round trips per request is the bulk of TTFB. The TTL matches the
 * `s-maxage=60` these responses already advertise, so it adds no new staleness.
 *
 * Retention is off in development, where it would only hide writes. `MODE` is
 * "development" for the dev server alone — vitest reports "test" — so tests and
 * production both exercise the real TTL.
 */
const DEFAULT_TTL_MS = import.meta.env.MODE === "development" ? 0 : 60_000;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

// Per-slug keys are derived from the URL, so the map needs a ceiling: a crawler
// hitting many unknown slugs must not grow it without bound.
const MAX_ENTRIES = 200;

const entries = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function prune() {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
  // Map iterates in insertion order, so the oldest keys go first.
  while (entries.size >= MAX_ENTRIES) {
    const oldest = entries.keys().next();
    if (oldest.done) break;
    entries.delete(oldest.value);
  }
}

export function readPublicCache<T>(key: string): T | undefined {
  const entry = entries.get(key) as Entry<T> | undefined;
  if (!entry || entry.expiresAt <= Date.now()) {
    return undefined;
  }
  return entry.value;
}

/**
 * Resolves `load` at most once per key per TTL. Concurrent callers share the
 * same in-flight promise so a burst of requests still makes one API call.
 * A rejected load is never cached — the caller's own fallback applies.
 */
export async function withPublicCache<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = readPublicCache<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const promise = load()
    .then((value) => {
      prune();
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function clearPublicCache() {
  entries.clear();
  inflight.clear();
}
