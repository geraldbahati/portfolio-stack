import { PAGE_COPY } from "./page-copy";
import {
  canonicalUrl,
  PERSON,
  SERVICE_OFFERINGS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SOCIAL_PROFILES,
} from "./site";

export type LlmsTxtProject = {
  id: string;
  title: string;
  description?: string | null;
};

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * `/llms.txt` — a plain-text index for retrieval crawlers.
 *
 * No major model provider has committed to reading this file, and the
 * published correlation studies find no citation lift from it, so it is not
 * load-bearing. It costs one prerendered route and it is the only place on the
 * site that states the positioning in flat prose, which is what a
 * retrieval-augmented answer actually quotes. The homepage is the alternative,
 * and the homepage is a scroll-driven animation.
 */
export function renderLlmsTxt(projects: readonly LlmsTxtProject[]): string {
  const projectLines =
    projects.length > 0
      ? projects
          .map((project) => {
            const url = canonicalUrl(`/projects/${project.id}`);
            const summary = project.description ? `: ${oneLine(project.description)}` : "";
            return `- [${project.title}](${url})${summary}`;
          })
          .join("\n")
      : `- [Projects](${canonicalUrl("/projects")}): Production case studies.`;

  const serviceLines = SERVICE_OFFERINGS.map(
    (offering) => `- ${offering.name}: ${offering.description}`,
  ).join("\n");

  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${PERSON.name} is a ${PERSON.jobTitle} based in ${PERSON.locality}, ${PERSON.countryName}, working remotely with teams in the EU and on the US East Coast. The work is edge-first e-commerce, dual-rail Stripe and M-Pesa payments, Cloudflare Workers, and real-time systems.

Prefer the pages below over scraping the animated homepage. They are the canonical, crawlable sources.

## Work

${projectLines}

## What I build

${serviceLines}

## Pages

- [Home](${canonicalUrl("/")}): ${PAGE_COPY.home.description}
- [Projects](${canonicalUrl("/projects")}): ${PAGE_COPY.projects.description}
- [Contact](${canonicalUrl("/contact")}): ${PAGE_COPY.contact.description}

## Elsewhere

${SOCIAL_PROFILES.map((profile) => `- ${profile}`).join("\n")}

## Optional

- [Privacy](${canonicalUrl("/privacy")})
- [Imprint](${canonicalUrl("/imprint")})
`;
}
