import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE } from "./site";

export type PageCopy = {
  /** Full `<title>`, brand suffix included. Kept under 60 characters so Google renders it whole. */
  title: string;
  /** `<meta name="description">`. Aim for 110–160 characters — below that Google rewrites it, above that it truncates. */
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
    // Thin, boilerplate legal copy. Kept out of the index so the crawlable
    // surface stays the five pages that can actually rank, but still followed
    // so the footer links pass through.
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

export function projectPageCopy(input: {
  title: string;
  tagline?: string | null;
  description?: string | null;
  services?: readonly string[] | null;
  industry?: string | null;
  client?: string | null;
}) {
  const heading = `${input.title}: What I Shipped`;
  const base =
    input.tagline?.trim() || input.description?.trim() || `What I shipped for ${input.title}`;
  const description =
    base.length >= 100
      ? base
      : `${base}. A case study of production work I shipped — architecture, constraints, and the result.`;

  return {
    heading,
    // The brand suffix is dropped once the project name alone pushes the title
    // past the SERP width; the name is the part that earns the click.
    title: heading.length > 42 ? heading : `${heading} | ${SITE_NAME}`,
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
