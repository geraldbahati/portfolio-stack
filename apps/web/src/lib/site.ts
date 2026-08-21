export const SITE_URL = "https://www.geraldbahati.dev";
export const SITE_NAME = "Gerald Bahati";
export const SITE_LANGUAGE = "en-KE";
export const SITE_LOCALE = "en_KE";
export const TWITTER_HANDLE = "@gerald_baha";

export const SITE_TITLE = "I Build Fast E-Commerce With M-Pesa | Gerald Bahati";
export const SITE_DESCRIPTION =
  "I'm Gerald Bahati, a software engineer in Nairobi. I've shipped production e-commerce with Stripe and M-Pesa, Cloudflare edge caching, and real-time systems. Here's the work.";

export const SOCIAL_PROFILES = [
  "https://www.linkedin.com/in/geraldbahati/",
  "https://github.com/geraldbahati",
  "https://www.instagram.com/ace._gb/",
  "https://x.com/gerald_baha",
] as const;

export const MENU_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
] as const;

export const SOCIAL_LINKS = [
  {
    id: "instagram",
    href: "https://www.instagram.com/ace._gb/",
    label: "Instagram",
  },
  {
    id: "linkedin",
    href: "https://www.linkedin.com/in/geraldbahati/",
    label: "LinkedIn",
  },
  { id: "x", href: "https://x.com/gerald_baha", label: "X" },
  {
    id: "whatsapp",
    href: "https://wa.me/254704713070",
    label: "WhatsApp",
  },
  { id: "github", href: "https://github.com/geraldbahati", label: "GitHub" },
] as const;

export const ITEM_ENTER_DELAYS = [0.3, 0.4, 0.5] as const;
export const ITEM_EXIT_DELAYS = [0.1, 0.05, 0] as const;
export const SOCIAL_ENTER_DELAYS = [0.3, 0.4, 0.5, 0.6, 0.7] as const;
export const SOCIAL_EXIT_DELAYS = [0.2, 0.15, 0.1, 0.05, 0] as const;

export const PAGE_COPY = {
  home: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  projects: {
    title: "Projects I Shipped: E-Commerce, M-Pesa & Real-Time",
    description:
      "Case studies of production work I've shipped — e-commerce with Stripe and M-Pesa, real-time systems, and edge-first web products.",
  },
  contact: {
    title: "Work With Me — I Build E-Commerce From Nairobi",
    description:
      "I'm Gerald Bahati. Use the form for a project, consulting, or a hiring conversation. I work remotely from Nairobi with EU and US East overlap.",
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "How I collect, use, and protect personal information on geraldbahati.dev — including analytics consent, contact form data, and GDPR/Kenya DPA rights.",
  },
  imprint: {
    title: "Imprint",
    description:
      "Legal notice for Gerald Bahati — business contact details and the person responsible for this site's content.",
  },
} as const;

export function canonicalUrl(pathname: string) {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return new URL(path, SITE_URL).href;
}

export type FaqEntry = {
  question: string;
  answer: string;
};

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#gerald-bahati`,
        name: SITE_NAME,
        url: SITE_URL,
        jobTitle: "Full-Stack Software Engineer",
        email: "contact@geraldbahati.dev",
        telephone: "+254-704-713-070",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Nairobi",
          addressCountry: "KE",
        },
        sameAs: [...SOCIAL_PROFILES],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: SITE_LANGUAGE,
        publisher: { "@id": `${SITE_URL}/#gerald-bahati` },
      },
    ],
  };
}

export function faqPageJsonLd(faqs: readonly FaqEntry[]) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    url: SITE_URL,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": `${SITE_URL}/#website` },
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

export function homepageJsonLd(faqs: readonly FaqEntry[]) {
  const base = personJsonLd();
  return {
    ...base,
    "@graph": [...base["@graph"], ...(faqs.length > 0 ? [faqPageJsonLd(faqs)] : [])],
  };
}

export function contactPageJsonLd() {
  const base = personJsonLd();
  return {
    ...base,
    "@graph": [
      ...base["@graph"],
      {
        "@type": "ContactPage",
        "@id": `${canonicalUrl("/contact")}#page`,
        name: PAGE_COPY.contact.title,
        description: PAGE_COPY.contact.description,
        url: canonicalUrl("/contact"),
        inLanguage: SITE_LANGUAGE,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: { "@id": `${SITE_URL}/#gerald-bahati` },
      },
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]),
    ],
  };
}

export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; path: string }>) {
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

export function projectPageCopy(input: {
  title: string;
  tagline?: string | null;
  description?: string | null;
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
    title: `${heading} | ${SITE_NAME}`,
    description,
  };
}

export type ProjectWorkInput = {
  slug: string;
  name: string;
  description?: string;
  image?: string | null;
  dateCreated?: string;
  dateModified?: string;
  keywords?: string[] | null;
  genre?: string | null;
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

  const work: Record<string, unknown> = {
    "@type": "CreativeWork",
    "@id": workId,
    name: input.name,
    description: input.description,
    url,
    inLanguage: SITE_LANGUAGE,
    author: { "@id": `${SITE_URL}/#gerald-bahati` },
    creator: { "@id": `${SITE_URL}/#gerald-bahati` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    ...(image ? { image: { "@type": "ImageObject", url: image } } : {}),
    ...(input.genre ? { genre: input.genre } : {}),
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

  const base = personJsonLd();
  return {
    ...base,
    "@graph": [
      ...base["@graph"],
      work,
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Projects", path: "/projects" },
        { name: input.name, path: `/projects/${input.slug}` },
      ]),
    ],
  };
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
  const base = personJsonLd();
  const list = {
    "@type": "ItemList",
    name: PAGE_COPY.projects.title,
    description: PAGE_COPY.projects.description,
    url: canonicalUrl("/projects"),
    numberOfItems: projects.length,
    itemListElement: projects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        "@id": `${canonicalUrl(`/projects/${project.id}`)}#work`,
        name: project.title,
        description: project.description || project.alt || undefined,
        url: canonicalUrl(`/projects/${project.id}`),
        author: { "@id": `${SITE_URL}/#gerald-bahati` },
        ...(project.poster ? { image: project.poster } : {}),
        ...(project.badges?.length
          ? { keywords: project.badges.map((badge) => badge.text).join(", ") }
          : {}),
      },
    })),
  };

  return {
    ...base,
    "@graph": [
      ...base["@graph"],
      list,
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Projects", path: "/projects" },
      ]),
    ],
  };
}
