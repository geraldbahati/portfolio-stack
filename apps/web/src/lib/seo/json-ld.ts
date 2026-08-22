import { PAGE_COPY } from "./page-copy";
import {
  canonicalUrl,
  OG_IMAGE,
  OG_IMAGE_URL,
  PERSON,
  PERSON_ID,
  PROFILE_PAGE_ID,
  SERVICE_OFFERINGS,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  SOCIAL_PROFILES,
  toAbsoluteSiteUrl,
  WEBSITE_ID,
} from "./site";

export type JsonLdNode = Record<string, unknown>;

export type FaqEntry = {
  question: string;
  answer: string;
};

/**
 * JSON-LD is injected unescaped into a `<script>` element, so a `</script>`
 * sequence anywhere in admin-authored project copy would close the block early
 * and drop the rest of the document into the parser as markup. Escaping `<`
 * keeps the payload valid JSON while making that impossible.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function graph(nodes: JsonLdNode[]): { "@context": string; "@graph": JsonLdNode[] } {
  return { "@context": "https://schema.org", "@graph": nodes };
}

const PERSON_IMAGE_ID = `${SITE_URL}/#portrait`;

export function personNode(): JsonLdNode {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSON.name,
    givenName: PERSON.givenName,
    familyName: PERSON.familyName,
    url: SITE_URL,
    image: { "@id": PERSON_IMAGE_ID },
    jobTitle: PERSON.jobTitle,
    description: SITE_DESCRIPTION,
    email: PERSON.email,
    knowsLanguage: [...PERSON.languages],
    knowsAbout: [...PERSON.knowsAbout],
    hasOccupation: {
      "@type": "Occupation",
      name: PERSON.jobTitle,
      occupationLocation: {
        "@type": "City",
        name: PERSON.locality,
        address: {
          "@type": "PostalAddress",
          addressLocality: PERSON.locality,
          addressCountry: PERSON.countryCode,
        },
      },
      skills: PERSON.knowsAbout.join(", "),
    },
    // The wedge is remote work for EU and US East teams, so the service area
    // is deliberately wider than the home location.
    homeLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: PERSON.locality,
        addressRegion: PERSON.region,
        addressCountry: PERSON.countryCode,
      },
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: PERSON.locality,
      addressRegion: PERSON.region,
      addressCountry: PERSON.countryCode,
    },
    makesOffer: SERVICE_OFFERINGS.map((offering) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: offering.name,
        description: offering.description,
        provider: { "@id": PERSON_ID },
        areaServed: [
          { "@type": "Country", name: PERSON.countryName },
          { "@type": "Place", name: "Remote worldwide" },
        ],
      },
    })),
    sameAs: [...SOCIAL_PROFILES],
    mainEntityOfPage: { "@id": PROFILE_PAGE_ID },
  };
}

function personImageNode(): JsonLdNode {
  return {
    "@type": "ImageObject",
    "@id": PERSON_IMAGE_ID,
    url: OG_IMAGE_URL,
    contentUrl: OG_IMAGE_URL,
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
    caption: `${PERSON.name}, ${PERSON.jobTitle} in ${PERSON.locality}`,
  };
}

export function websiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: "Gerald Bahati Portfolio",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    keywords: SITE_KEYWORDS.join(", "),
    publisher: { "@id": PERSON_ID },
    copyrightHolder: { "@id": PERSON_ID },
    about: { "@id": PERSON_ID },
  };
}

/** The three nodes every page repeats so a crawler can merge pages into one entity. */
function baseNodes(): JsonLdNode[] {
  return [websiteNode(), personNode(), personImageNode()];
}

export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; path: string }>): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

type PageNodeInput = {
  type: "WebPage" | "CollectionPage" | "ContactPage" | "AboutPage" | "ProfilePage";
  path: string;
  title: string;
  description: string;
  breadcrumb?: ReadonlyArray<{ name: string; path: string }>;
  image?: string;
  datePublished?: string;
  dateModified?: string;
};

/**
 * The page-level node that ties a URL to the site graph. `breadcrumb` is
 * referenced by `@id` rather than nested so the BreadcrumbList stays a
 * top-level node, which is what Google's breadcrumb parser looks for.
 */
export function pageNode(input: PageNodeInput): JsonLdNode {
  const url = canonicalUrl(input.path);
  const image = input.image ? toAbsoluteSiteUrl(input.image) : OG_IMAGE_URL;

  return {
    "@type": input.type,
    "@id": `${url}#page`,
    url,
    name: input.title,
    description: input.description,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": PERSON_ID },
    primaryImageOfPage: { "@type": "ImageObject", url: image },
    ...(input.breadcrumb ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

function breadcrumbNodeFor(
  path: string,
  items: ReadonlyArray<{ name: string; path: string }>,
): JsonLdNode {
  return { ...breadcrumbJsonLd(items), "@id": `${canonicalUrl(path)}#breadcrumb` };
}

export function faqPageJsonLd(faqs: readonly FaqEntry[]): JsonLdNode {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    url: SITE_URL,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * The layout default, and the fallback for pages with nothing page-specific to
 * say — the 404 among them. Deliberately carries no page node: emitting one
 * would claim an `@id` for whatever URL happened to render it.
 */
export function personJsonLd() {
  return graph(baseNodes());
}

export function homepageJsonLd(faqs: readonly FaqEntry[]) {
  return graph([
    ...baseNodes(),
    {
      "@type": "ProfilePage",
      "@id": PROFILE_PAGE_ID,
      url: SITE_URL,
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      inLanguage: SITE_LANGUAGE,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": PERSON_ID },
      about: { "@id": PERSON_ID },
      primaryImageOfPage: { "@id": PERSON_IMAGE_ID },
    },
    ...(faqs.length > 0 ? [faqPageJsonLd(faqs)] : []),
  ]);
}

export function simplePageJsonLd(page: { title: string; description: string; path: string }) {
  const breadcrumb = [
    { name: "Home", path: "/" },
    { name: page.title.split(" | ")[0] ?? page.title, path: page.path },
  ];

  return graph([
    ...baseNodes(),
    pageNode({
      type: "WebPage",
      path: page.path,
      title: page.title,
      description: page.description,
      breadcrumb,
    }),
    breadcrumbNodeFor(page.path, breadcrumb),
  ]);
}

export function contactPageJsonLd() {
  const breadcrumb = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ];

  return graph([
    ...baseNodes(),
    {
      ...pageNode({
        type: "ContactPage",
        path: "/contact",
        title: PAGE_COPY.contact.title,
        description: PAGE_COPY.contact.description,
        breadcrumb,
      }),
      mainEntity: { "@id": PERSON_ID },
    },
    // A second node under the Person's `@id`. Consumers merge same-`@id` nodes,
    // so the contact channel lands on the shared entity instead of floating
    // free, without duplicating the whole Person on every page.
    {
      "@id": PERSON_ID,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Project and hiring enquiries",
        email: PERSON.email,
        telephone: PERSON.telephone,
        url: canonicalUrl("/contact"),
        areaServed: ["KE", "EU", "US"],
        availableLanguage: [...PERSON.languages],
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "08:00",
          closes: "18:00",
        },
      },
    },
    breadcrumbNodeFor("/contact", breadcrumb),
  ]);
}

export type ProjectWorkInput = {
  slug: string;
  name: string;
  description?: string;
  image?: string | null;
  dateCreated?: string;
  dateModified?: string;
  keywords?: readonly string[] | null;
  genre?: string | null;
  client?: string | null;
  videoUrl?: string | null;
  videoPoster?: string | null;
  testimonial?: {
    quote: string;
    authorName: string;
    authorRole?: string | null;
    authorCompany?: string | null;
  } | null;
};

export function projectWorkJsonLd(input: ProjectWorkInput) {
  const url = canonicalUrl(`/projects/${input.slug}`);
  const workId = `${url}#work`;
  const image = input.image || undefined;
  const videoUrl = input.videoUrl || undefined;
  const videoPoster = input.videoPoster || image;
  const breadcrumb = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: input.name, path: `/projects/${input.slug}` },
  ];

  const work: JsonLdNode = {
    "@type": "CreativeWork",
    "@id": workId,
    name: input.name,
    description: input.description,
    url,
    inLanguage: SITE_LANGUAGE,
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
    mainEntityOfPage: { "@id": `${url}#page` },
    ...(image ? { image: { "@type": "ImageObject", url: image } } : {}),
    ...(input.genre ? { genre: input.genre } : {}),
    ...(input.client
      ? { sourceOrganization: { "@type": "Organization", name: input.client } }
      : {}),
    ...(input.keywords && input.keywords.length > 0 ? { keywords: input.keywords.join(", ") } : {}),
    ...(input.dateCreated ? { dateCreated: input.dateCreated } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };

  if (videoUrl) {
    work.video = {
      "@type": "VideoObject",
      name: input.name,
      description: input.description,
      contentUrl: videoUrl,
      thumbnailUrl: videoPoster,
      ...(input.dateCreated ? { uploadDate: input.dateCreated } : {}),
    };
  }

  if (input.testimonial?.quote) {
    work.review = {
      "@type": "Review",
      reviewBody: input.testimonial.quote,
      author: {
        "@type": "Person",
        name: input.testimonial.authorName,
        ...(input.testimonial.authorRole ? { jobTitle: input.testimonial.authorRole } : {}),
        ...(input.testimonial.authorCompany
          ? { worksFor: { "@type": "Organization", name: input.testimonial.authorCompany } }
          : {}),
      },
      itemReviewed: { "@id": workId },
    };
  }

  return graph([
    ...baseNodes(),
    pageNode({
      type: "WebPage",
      path: `/projects/${input.slug}`,
      title: input.name,
      description: input.description ?? "",
      breadcrumb,
      image: image ?? undefined,
      datePublished: input.dateCreated,
      dateModified: input.dateModified,
    }),
    work,
    breadcrumbNodeFor(`/projects/${input.slug}`, breadcrumb),
  ]);
}

export function projectsIndexJsonLd(
  projects: ReadonlyArray<{
    id: string;
    title: string;
    description: string | null;
    alt: string | null;
    poster: string | null;
    badges: Array<{ text: string }> | null;
  }>,
) {
  const breadcrumb = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
  ];

  const list: JsonLdNode = {
    "@type": "ItemList",
    "@id": `${canonicalUrl("/projects")}#list`,
    name: PAGE_COPY.projects.title,
    description: PAGE_COPY.projects.description,
    url: canonicalUrl("/projects"),
    numberOfItems: projects.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: projects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        "@id": `${canonicalUrl(`/projects/${project.id}`)}#work`,
        name: project.title,
        description: project.description || project.alt || undefined,
        url: canonicalUrl(`/projects/${project.id}`),
        author: { "@id": PERSON_ID },
        ...(project.poster ? { image: project.poster } : {}),
        ...(project.badges?.length
          ? { keywords: project.badges.map((badge) => badge.text).join(", ") }
          : {}),
      },
    })),
  };

  return graph([
    ...baseNodes(),
    {
      ...pageNode({
        type: "CollectionPage",
        path: "/projects",
        title: PAGE_COPY.projects.title,
        description: PAGE_COPY.projects.description,
        breadcrumb,
      }),
      mainEntity: { "@id": `${canonicalUrl("/projects")}#list` },
    },
    list,
    breadcrumbNodeFor("/projects", breadcrumb),
  ]);
}
