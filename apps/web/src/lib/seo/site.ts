export const SITE_URL = "https://www.geraldbahati.dev";
export const SITE_NAME = "Gerald Bahati";
export const SITE_LANGUAGE = "en-KE";
export const SITE_LOCALE = "en_KE";
export const TWITTER_HANDLE = "@gerald_baha";

export const SITE_TITLE = "I Build Fast E-Commerce With M-Pesa | Gerald Bahati";
export const SITE_DESCRIPTION =
  "I'm Gerald Bahati, a software engineer in Nairobi. I ship production e-commerce with Stripe and M-Pesa, Cloudflare edge caching, and real-time systems.";

export const SOCIAL_PROFILES = [
  "https://www.linkedin.com/in/geraldbahati/",
  "https://github.com/geraldbahati",
  "https://www.instagram.com/ace._gb/",
  "https://x.com/gerald_baha",
] as const;

/**
 * Stable `@id` values for the JSON-LD graph. Every page emits the same node
 * identifiers so a crawler that has seen one page can merge the rest into a
 * single entity rather than re-deriving a person per URL.
 */
export const PERSON_ID = `${SITE_URL}/#gerald-bahati`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const PROFILE_PAGE_ID = `${SITE_URL}/#profile-page`;

export const PERSON = {
  givenName: "Gerald",
  familyName: "Bahati",
  name: SITE_NAME,
  jobTitle: "Full-Stack Software Engineer",
  email: "contact@geraldbahati.dev",
  telephone: "+254-704-713-070",
  locality: "Nairobi",
  region: "Nairobi County",
  countryCode: "KE",
  countryName: "Kenya",
  languages: ["English", "Swahili"],
  knowsAbout: [
    "Full-stack software engineering",
    "E-commerce platforms",
    "M-Pesa payment integration",
    "Stripe payment integration",
    "Cloudflare Workers",
    "Edge computing",
    "Real-time systems",
    "WebSockets",
    "React",
    "Next.js",
    "Astro",
    "TypeScript",
    "Go",
    "Java",
    "PostgreSQL",
    "Core Web Vitals",
  ],
} as const;

/**
 * Search engines dropped `meta[name=keywords]` as a ranking input long ago, so
 * these exist for the JSON-LD `about`/`keywords` fields and for the retrieval
 * crawlers that do read them. Keep them honest — they double as the wedge
 * statement the rest of the copy is written against.
 */
export const SITE_KEYWORDS = [
  "Gerald Bahati",
  "Gerald Bahati software engineer",
  "Nairobi software engineer",
  "Kenya software engineer",
  "M-Pesa developer",
  "M-Pesa Daraja integration",
  "e-commerce software engineer",
  "Cloudflare Workers developer",
  "edge-first web development",
  "full-stack software engineer",
  "React",
  "Next.js",
  "TypeScript",
  "Go",
  "real-time systems",
] as const;

/**
 * The default social card. A committed 1200x630 JPEG rather than a runtime
 * render: LinkedIn and X both refuse to re-fetch a card that timed out once,
 * so the image has to be on the static asset handler with no cold start.
 */
export const OG_IMAGE = {
  path: "/og.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: `${SITE_NAME} — full-stack software engineer in Nairobi building edge-first e-commerce, M-Pesa payments, and real-time systems.`,
} as const;

/**
 * Services offered, mirrored from the visible copy on the homepage. Emitted as
 * `Person.makesOffer` so a "hire a developer for X" query has something
 * structured to match against.
 */
export const SERVICE_OFFERINGS = [
  {
    name: "Frontend engineering",
    description:
      "React and Next.js interfaces tuned for Core Web Vitals and shipped with edge-first rendering.",
  },
  {
    name: "Backend and API engineering",
    description:
      "Type-safe APIs, data layers, and payment flows including M-Pesa and Stripe dual-rail checkout.",
  },
  {
    name: "Cloud and DevOps",
    description:
      "Cloudflare Workers, KV, R2 and Queues, AWS infrastructure, containerisation, and CI/CD pipelines.",
  },
  {
    name: "AI and real-time systems",
    description:
      "LLM product features, vector search and recommendations, and WebSocket architectures.",
  },
] as const;

export function canonicalUrl(pathname: string) {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return new URL(path, SITE_URL).href;
}

/**
 * Resolves a site-relative path to an absolute URL while passing an already
 * absolute one (an R2 or Stream asset) through untouched. Structured data and
 * `og:image` both reject relative references.
 */
export function toAbsoluteSiteUrl(value: string) {
  return new URL(value, `${SITE_URL}/`).href;
}

export const OG_IMAGE_URL = toAbsoluteSiteUrl(OG_IMAGE.path);

/** Hostnames attached to the Worker that redirect to {@link SITE_URL}. */
export const ALIAS_HOSTS = ["geraldbahati.dev"] as const;

/** Canonical URL for an alias request, or `null` if already canonical. Path
 * and query are preserved so deep links survive the redirect. */
export function canonicalRedirectFor(url: URL): string | null {
  if (!ALIAS_HOSTS.includes(url.hostname as (typeof ALIAS_HOSTS)[number])) {
    return null;
  }

  const target = new URL(SITE_URL);
  target.pathname = url.pathname;
  target.search = url.search;
  return target.href;
}
