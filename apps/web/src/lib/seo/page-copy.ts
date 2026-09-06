import { PROJECT_SEARCH_COPY } from "./project-search-copy";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE } from "./site";

export type PageCopy = {
  /** Concise page title. Search engines may rewrite or truncate it to fit the result. */
  title: string;
  /** A specific page summary; length targets are editorial guidelines, not Google limits. */
  description: string;
  path: string;
  keywords: readonly string[];
  /** `false` keeps the page out of the index while still following its links. */
  indexable: boolean;
};

export const PAGE_COPY = {
  home: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
    keywords: SITE_KEYWORDS,
    indexable: true,
  },
  projects: {
    title: "Projects I Shipped: E-Commerce & M-Pesa | Gerald Bahati",
    description:
      "Case studies of production work I've shipped — e-commerce with Stripe and M-Pesa, real-time systems, and edge-first web products on Cloudflare.",
    path: "/projects",
    keywords: [
      "Gerald Bahati projects",
      "e-commerce case study",
      "M-Pesa integration case study",
      "real-time systems",
      "Cloudflare Workers portfolio",
    ],
    indexable: true,
  },
  contact: {
    title: "Work With Me — E-Commerce & M-Pesa | Gerald Bahati",
    description:
      "Reach me for a project, consulting, or a hiring conversation. I build e-commerce and real-time systems remotely from Nairobi, with EU and US East overlap.",
    path: "/contact",
    keywords: [
      "hire Gerald Bahati",
      "Nairobi software engineer contact",
      "e-commerce developer Kenya",
      "M-Pesa developer for hire",
      "remote software engineer EU US",
    ],
    indexable: true,
  },
  privacy: {
    title: "Privacy Policy | Gerald Bahati",
    description:
      "How I collect, use, and protect personal information on geraldbahati.dev — including analytics consent, contact form data, and GDPR/Kenya DPA rights.",
    path: "/privacy",
    keywords: ["privacy policy", "data protection", "GDPR", "Kenya DPA"],
    // Keep legal pages available to visitors without featuring them in search.
    indexable: false,
  },
  imprint: {
    title: "Imprint | Gerald Bahati",
    description:
      "Legal notice for Gerald Bahati — business contact details and the person responsible for the content published on this site.",
    path: "/imprint",
    keywords: ["imprint", "legal notice", "Gerald Bahati"],
    indexable: false,
  },
} as const satisfies Record<string, PageCopy>;

/** Paths that belong in the sitemap: everything the index is allowed to hold. */
export const INDEXABLE_PATHS = Object.values(PAGE_COPY)
  .filter((page) => page.indexable)
  .map((page) => page.path);

const PROJECT_DESCRIPTION_MAX = 160;
const SEARCH_TITLE_MAX = 60;

function projectDescription(value: string) {
  const summary = value.replace(/\s+/g, " ").trim();
  if (summary.length <= PROJECT_DESCRIPTION_MAX) return summary;

  const clipped = summary.slice(0, PROJECT_DESCRIPTION_MAX - 1).trimEnd();
  const lastWordBoundary = clipped.lastIndexOf(" ");
  const end = lastWordBoundary > 0 ? lastWordBoundary : clipped.length;

  return `${clipped.slice(0, end).trimEnd()}…`;
}

export function projectPageCopy(input: {
  slug?: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  services?: readonly string[] | null;
  industry?: string | null;
  client?: string | null;
}) {
  const heading = `${input.title}: What I Shipped`;
  const editorial =
    input.slug && Object.hasOwn(PROJECT_SEARCH_COPY, input.slug)
      ? PROJECT_SEARCH_COPY[input.slug]
      : undefined;
  const description = projectDescription(
    editorial?.description ||
      input.description?.trim() ||
      input.tagline?.trim() ||
      `${input.title}: ${input.industry?.trim() || "software engineering"} case study by ${SITE_NAME}.`,
  );
  const topic = editorial?.topic || input.industry?.trim();
  const searchTitle = topic ? `${input.title}: ${topic} Case Study` : `${input.title} Case Study`;
  const brandedTitle = `${searchTitle} | ${SITE_NAME}`;

  return {
    heading,
    title: brandedTitle.length <= SEARCH_TITLE_MAX ? brandedTitle : searchTitle,
    description,
    keywords: [
      input.title,
      `${input.title} case study`,
      ...(input.services ?? []),
      ...(input.industry ? [input.industry] : []),
      ...(input.client ? [input.client] : []),
      "Gerald Bahati",
    ],
  };
}
