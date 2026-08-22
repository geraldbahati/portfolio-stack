import { describe, expect, it } from "vitest";

import { FAQ_ENTRIES } from "../../features/projects-faq/copy";
import {
  contactPageJsonLd,
  homepageJsonLd,
  personJsonLd,
  projectsIndexJsonLd,
  projectWorkJsonLd,
  serializeJsonLd,
  simplePageJsonLd,
} from "./json-ld";
import { PAGE_COPY, projectPageCopy } from "./page-copy";
import { canonicalUrl, PERSON_ID, SITE_URL, WEBSITE_ID } from "./site";

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

describe("serializeJsonLd", () => {
  it("escapes `<` so admin copy cannot close the script element", () => {
    const payload = serializeJsonLd({ name: "</script><img onerror=alert(1)>" });

    expect(payload).not.toContain("</script>");
    expect(payload).toContain("\\u003c/script>");
    expect(JSON.parse(payload).name).toBe("</script><img onerror=alert(1)>");
  });
});

describe("the shared entity graph", () => {
  const graphs = {
    person: personJsonLd(),
    homepage: homepageJsonLd(FAQ_ENTRIES),
    contact: contactPageJsonLd(),
    projects: projectsIndexJsonLd([]),
    project: projectWorkJsonLd({ slug: "webline-store", name: "Webline Store" }),
    legal: simplePageJsonLd(PAGE_COPY.privacy),
  };

  it.each(Object.entries(graphs))("%s declares one @context at the root", (_name, graph) => {
    expect(graph["@context"]).toBe("https://schema.org");
    // A nested @context inside @graph is the classic way to end up with two
    // disconnected graphs that no consumer merges.
    expect(JSON.stringify(graph["@graph"])).not.toContain("@context");
  });

  it.each(Object.entries(graphs))("%s repeats the same Person and WebSite ids", (_name, graph) => {
    const ids = graph["@graph"].map((node) => node["@id"]);
    expect(ids).toContain(PERSON_ID);
    expect(ids).toContain(WEBSITE_ID);
  });

  it.each(Object.entries(graphs))("%s gives every node a type or an id", (_name, graph) => {
    for (const node of graph["@graph"]) {
      expect(Boolean(node["@type"]) || Boolean(node["@id"])).toBe(true);
    }
  });

  it("advertises the services as offers on the Person", () => {
    const person = graphs.homepage["@graph"].find((node) => node["@id"] === PERSON_ID) as {
      makesOffer: Array<{ itemOffered: { name: string } }>;
    };

    expect(person.makesOffer.map((offer) => offer.itemOffered.name)).toContain(
      "AI and real-time systems",
    );
  });

  it("puts the ProfilePage and the FAQ on the homepage only", () => {
    const types = (graph: { "@graph": Array<Record<string, unknown>> }) =>
      graph["@graph"].map((node) => node["@type"]);

    expect(types(graphs.homepage)).toContain("ProfilePage");
    expect(types(graphs.homepage)).toContain("FAQPage");
    expect(types(graphs.projects)).not.toContain("FAQPage");
  });

  it("resolves the page node's breadcrumb reference to a real node", () => {
    const nodes = graphs.project["@graph"];
    const page = nodes.find((node) => node["@type"] === "WebPage") as {
      breadcrumb: { "@id": string };
    };
    const crumbs = nodes.find((node) => node["@type"] === "BreadcrumbList") as {
      "@id": string;
      itemListElement: unknown[];
    };

    expect(page.breadcrumb["@id"]).toBe(crumbs["@id"]);
    expect(crumbs.itemListElement).toHaveLength(3);
  });

  it("attaches the contact channel to the shared Person rather than a loose node", () => {
    const merged = graphs.contact["@graph"].filter((node) => node["@id"] === PERSON_ID);
    const withContact = merged.find((node) => "contactPoint" in node) as {
      contactPoint: { email: string; url: string };
    };

    expect(merged).toHaveLength(2);
    expect(withContact.contactPoint.email).toBe("contact@geraldbahati.dev");
    expect(withContact.contactPoint.url).toBe(canonicalUrl("/contact"));
  });
});
