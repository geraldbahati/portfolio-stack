/**
 * Query parameters that describe campaign attribution or public navigation.
 * Everything else is dropped. An allowlist cannot leak a parameter nobody
 * anticipated (`access_token`, `Email`, `signature`, ...); a denylist can.
 */
const ALLOWED_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
  "page",
  "category",
]);

/**
 * Event properties that hold a URL. Scrubbing is limited to these known keys
 * so its cost stays constant no matter how large an event grows.
 */
const URL_PROPERTY_KEYS = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
  "$session_entry_url",
  "$session_entry_referrer",
  "$prev_pageview_url",
  "destination",
] as const;

/** Person-property containers PostHog attaches alongside some events. */
const NESTED_PROPERTY_KEYS = ["$set", "$set_once"] as const;

const MAX_URL_LENGTH = 2_048;
const RELATIVE_BASE = "https://relative.invalid";

/**
 * Reduce a URL to what analytics and error tracking legitimately need: the
 * origin, the path, and allowlisted query parameters. Credentials and the
 * fragment (where OAuth-style tokens travel) are always removed. A non-HTTP
 * destination such as `mailto:` or `tel:` keeps only its scheme.
 *
 * Returns `undefined` for anything that is not a parseable URL.
 */
export function sanitizeUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;

  const relative = raw.startsWith("/") && !raw.startsWith("//");
  let url: URL;
  try {
    url = relative ? new URL(raw, RELATIVE_BASE) : new URL(raw);
  } catch {
    return undefined;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return url.protocol;
  }

  url.username = "";
  url.password = "";
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) url.searchParams.delete(key);
  }

  const sanitized = relative ? `${url.pathname}${url.search}` : url.toString();
  if (sanitized.length <= MAX_URL_LENGTH) return sanitized;
  return relative ? url.pathname.slice(0, MAX_URL_LENGTH) : `${url.origin}${url.pathname}`;
}

function scrubUrlKeys(properties: Record<string, unknown>) {
  for (const key of URL_PROPERTY_KEYS) {
    if (!(key in properties)) continue;
    const sanitized = sanitizeUrl(properties[key]);
    if (sanitized) properties[key] = sanitized;
    else delete properties[key];
  }
}

/**
 * Return a copy of event properties with every known URL field scrubbed,
 * including the person-property containers PostHog nests in an event.
 */
export function scrubUrlProperties<T extends Record<string, unknown>>(properties: T): T {
  const scrubbed: Record<string, unknown> = { ...properties };
  scrubUrlKeys(scrubbed);

  for (const key of NESTED_PROPERTY_KEYS) {
    const nested = scrubbed[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const copy = { ...(nested as Record<string, unknown>) };
      scrubUrlKeys(copy);
      scrubbed[key] = copy;
    }
  }

  return scrubbed as T;
}

/** Absolute URLs embedded in text; trailing punctuation is not part of the URL. */
const URL_IN_TEXT = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>`]+[^\s"'<>`.,;:!?)\]}]/gi;
/** Field names whose value is a credential, optionally prefixed (`db_password`, `x-api-key`). */
const SECRET_NAME = String.raw`(?:[\w-]*[_-])?(?:access_token|refresh_token|id_token|client_secret|api[_-]?key|apikey|token|secret|password|passphrase|passwd|pwd|signature|sig|session(?:_?id)?|cookie|credentials?)`;
/**
 * A credential field and its value, in the shapes error messages carry them:
 * `token=v`, `password: v`, JSON `"password":"v"`, JSON escaped inside a
 * string `\"password\":\"v\"`, and single-quoted `'secret': 'v'`. A quoted value
 * is consumed through its closing quote (spaces and escaped quotes included)
 * or, when a message was truncated mid-value, to the end of the text.
 */
const SECRET_FIELD = new RegExp(
  String.raw`(\\?["']?)\b(${SECRET_NAME})\1(\s*[=:]\s*)(?!\[redacted\])(?:(\\")(?:(?!\\").)*(?:\\"|$)|(["'])(?:(?!\5)[^\\]|\\.)*(?:\5|$)|[^\s"'&,;}\]]+)`,
  "gi",
);
/** Keep the field name and its quoting so the message stays readable; drop only the value. */
function redactField(
  match: string,
  keyQuote: string,
  name: string,
  separator: string,
  escapedQuote: string | undefined,
  quote: string | undefined,
) {
  const valueQuote = escapedQuote ?? quote ?? "";
  const opening = `${keyQuote}${name}${keyQuote}${separator}${valueQuote}`;
  // A value truncated mid-string has no closing quote; do not invent one.
  const closed = valueQuote !== "" && match.length > opening.length && match.endsWith(valueQuote);
  return `${opening}[redacted]${closed ? valueQuote : ""}`;
}

/** Header lines whose whole value is a credential, including `a=b; c=d` cookie lists. */
const SECRET_HEADER = /\b((?:proxy-)?authorization|(?:set-)?cookie)(\s*:\s*)(?!\s*["'])[^\r\n]+/gi;
const BEARER_TOKEN = /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Redaction is linear in its input; this bounds the input before any pattern runs. */
const MAX_REDACTION_INPUT = 8_192;

/**
 * Remove credentials and personal data from free text such as an exception
 * message, then bound its length. Messages from drivers, providers, and the
 * browser can echo request URLs, headers, and input values. Embedded URLs get
 * the same allowlist as page URLs; credential assignments, bearer tokens,
 * JWTs, and email addresses are replaced with placeholders.
 */
export function redactFreeText(value: string, maxLength = 1_024): string {
  const redacted = value
    .slice(0, MAX_REDACTION_INPUT)
    .replace(URL_IN_TEXT, (url) => sanitizeUrl(url) ?? "[url]")
    .replace(SECRET_HEADER, "$1$2[redacted]")
    .replace(SECRET_FIELD, redactField)
    .replace(BEARER_TOKEN, "$1 [redacted]")
    .replace(JWT, "[jwt]")
    .replace(EMAIL_PATTERN, "[email]");
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength - 1)}…` : redacted;
}

/**
 * Reduce a stack-frame location to the script it names. Frame URLs need no
 * query or fragment to be symbolicated, and an inline script's frame carries
 * the full page URL, so both are always dropped.
 */
export function sanitizeFrameLocation(raw: string, maxLength = 1_024): string {
  let location = raw;
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    location = url.toString();
  } catch {
    // Not a URL (a bare module name such as `index.js`): cut at the first query or fragment.
    location = raw.split(/[?#]/, 1)[0] ?? "";
  }
  return location.slice(0, maxLength);
}
