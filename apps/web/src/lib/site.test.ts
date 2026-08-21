import { describe, expect, it } from "vitest";

import { FAQ_ENTRIES } from "../sections/projects-faq/copy";
import {
  canonicalUrl,
  contactPageJsonLd,
  homepageJsonLd,
  PAGE_COPY,
  projectPageCopy,
  projectsIndexJsonLd,
  projectWorkJsonLd,
  SITE_URL,
} from "./site";

describe("homepageJsonLd", () => {
  it("adds an FAQPage node matching the visible answers", () => {
    const graph = homepageJsonLd(FAQ_ENTRIES);
    const faqPage = graph["@graph"].find((node) => node["@type"] === "FAQPage") as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };

    expect(faqPage.mainEntity).toHaveLength(5);
    expect(faqPage.mainEntity[0]?.name).toBe("HOW DOES WORKING WITH YOU LOOK LIKE?");
    expect(faqPage.mainEntity[0]?.acceptedAnswer.text).toContain("Understanding the Problem:");
  });
});

describe("projectsIndexJsonLd", () => {
  const projects = [
    {
      id: "webline-store",
      title: "Webline Store",
      description: "M-Pesa checkout for a Nairobi shop.",
      alt: "Webline Store preview",
      poster: "https://media.geraldbahati.dev/projects/store.webp",
      badges: [{ text: "E-commerce" }, { text: "M-Pesa" }],
    },
    {
      id: "therapy-in-kenya",
      title: "Therapy in Kenya",
      description: null,
      alt: "Therapy platform",
      poster: null,
      badges: null,
    },
  ];

  it("lists every project as CreativeWork items with canonical URLs", () => {
    const graph = projectsIndexJsonLd(projects);
    const list = graph["@graph"].find((node) => node["@type"] === "ItemList") as {
      name: string;
      url: string;
      numberOfItems: number;
      itemListElement: Array<{
        position: number;
        item: { "@id": string; name: string; url: string; image?: string; keywords?: string };
      }>;
    };

    expect(list.name).toBe(PAGE_COPY.projects.title);
    expect(list.url).toBe(canonicalUrl("/projects"));
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement).toHaveLength(2);
    expect(list.itemListElement[0]?.position).toBe(1);
    expect(list.itemListElement[0]?.item.url).toBe(canonicalUrl("/projects/webline-store"));
    expect(list.itemListElement[0]?.item["@id"]).toBe(
      `${canonicalUrl("/projects/webline-store")}#work`,
    );
    expect(list.itemListElement[0]?.item.image).toBe(projects[0]?.poster);
    expect(list.itemListElement[0]?.item.keywords).toBe("E-commerce, M-Pesa");
    expect(list.itemListElement[1]?.item.image).toBeUndefined();
  });

  it("includes Home → Projects breadcrumbs", () => {
    const graph = projectsIndexJsonLd(projects);
    const crumbs = graph["@graph"].find((node) => node["@type"] === "BreadcrumbList") as {
      itemListElement: Array<{ name: string; item: string; position: number }>;
    };

    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") },
      { "@type": "ListItem", position: 2, name: "Projects", item: canonicalUrl("/projects") },
    ]);
    expect(canonicalUrl("/")).toBe(`${SITE_URL}/`);
  });
});

describe("contactPageJsonLd", () => {
  it("points ContactPage at the Person entity", () => {
    const serialized = JSON.stringify(contactPageJsonLd());
    expect(serialized).toContain('"@type":"ContactPage"');
    expect(serialized).toContain("contact@geraldbahati.dev");
    expect(serialized).toContain("/contact");
  });
});

describe("projectWorkJsonLd", () => {
  it("nests a Review only when a testimonial exists", () => {
    const without = JSON.stringify(
      projectWorkJsonLd({
        slug: "webline-store",
        name: "Webline Store",
        description: "Edge storefront",
      }),
    );
    expect(without).not.toContain('"@type":"Review"');
    expect(without).toContain(`${SITE_URL}/projects/webline-store#work`);

    const withReview = JSON.stringify(
      projectWorkJsonLd({
        slug: "webline-store",
        name: "Webline Store",
        description: "Edge storefront",
        image: "https://media.geraldbahati.dev/webline/store-01-hero.webp",
        testimonial: {
          quote: "Gerald shipped the platform on time.",
          authorName: "Klaus Hering",
          authorRole: "Sales Management",
          authorCompany: "Rapid GmbH",
        },
      }),
    );
    expect(withReview).toContain('"@type":"Review"');
    expect(withReview).toContain("Gerald shipped the platform on time.");
    expect(withReview).not.toContain("aggregateRating");
  });
});

describe("projectPageCopy", () => {
  it("pads short taglines to a usable meta description", () => {
    const copy = projectPageCopy({
      title: "Webline Store",
      tagline: "A catalogue that loads before you finish clicking",
    });
    expect(copy.heading).toBe("Webline Store: What I Shipped");
    expect(copy.title).toContain("Gerald Bahati");
    expect(copy.description.length).toBeGreaterThanOrEqual(100);
  });
});
