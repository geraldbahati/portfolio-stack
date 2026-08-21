import type { ProjectColor, ProjectDeviceType, ProjectGalleryType } from "./schema/project";

const MEDIA = "https://media.geraldbahati.dev/webline";

const img = (name: string) => `${MEDIA}/${name}.webp`;
const timg = (name: string) => `https://media.geraldbahati.dev/therapy/${name}.webp`;

export type SeedCaseStudyDetails = {
  heroImage: string;
  heroAlt: string;
  tagline: string;
  fullDescription: string;
  client: string;
  industry: string;
  period: string;
  year: number;
  services: string[];
  features: string[];
  colorPalette: ProjectColor[];
  relatedProjectIds: string[];
};

export type SeedCaseStudyMetric = {
  value: string;
  label: string;
  icon?: string;
};

export type SeedCaseStudyChallenge = {
  title: string;
  content: string;
};

export type SeedCaseStudyGalleryItem = {
  src: string;
  alt: string;
  caption: string;
  galleryType: ProjectGalleryType;
  width: number;
  height: number;
  deviceType: ProjectDeviceType;
};

export type SeedCaseStudy = {
  projectId: string;
  details: SeedCaseStudyDetails;
  metrics: SeedCaseStudyMetric[];
  challenges: SeedCaseStudyChallenge[];
  gallery: SeedCaseStudyGalleryItem[];
};

export const SEED_CASE_STUDIES: SeedCaseStudy[] = [
  {
    projectId: "webline-technologies",
    details: {
      heroImage: img("landing-scene-01"),
      heroAlt: "Webline Technologies hero — 'Technology that keeps business moving'",
      tagline: "Technology that keeps business moving",
      client: "Webline Technologies Ltd.",
      industry: "Technology / Managed IT Services",
      period: "2026",
      year: 2026,
      services: [
        "Brand & Narrative Design",
        "Front-End Engineering",
        "Motion / Scroll Design",
        "Multi-Zone Architecture",
        "Technical SEO",
        "Performance Engineering",
      ],
      features: [
        "Scroll-driven pinned scenes (GSAP ScrollSmoother)",
        "Five service pillars as full-bleed chapters",
        "Multi-zone hand-off to the storefront",
        "Server-rendered, fully static shell",
        "Structured data + generated sitemap",
        "Accessible reduced-motion fallbacks",
      ],
      colorPalette: [
        { hex: "#F2EFE9", name: "Bone" },
        { hex: "#0B0B0B", name: "Ink" },
        { hex: "#1D4ED8", name: "Signal Blue" },
        { hex: "#8A8578", name: "Warm Grey" },
      ],
      relatedProjectIds: ["webline-store"],
      fullDescription: `## Overview

Webline Technologies Ltd. is a Nairobi technology integrator — infrastructure, workplace hardware, security and managed support. The site had to earn trust before anyone reached a product, then hand off to the storefront without a visible seam.

It reads as one scroll-driven narrative. Five service pillars become full-bleed chapters that pin while their imagery moves behind the copy, so the page advances at reading pace instead of presenting a wall of cards.

## Architecture

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16, React 19 |
| **Motion** | GSAP ScrollSmoother, pinned scenes |
| **Rendering** | Static shell, server components |
| **Zoning** | Reverse-proxy rewrites to the storefront |

## One domain, two apps

\`webline.co.ke\` serves the corporate site; \`/store/*\` is rewritten to a separate storefront deployment running its own \`basePath\`. Two codebases, two release cadences, one address bar.`,
    },
    metrics: [
      { value: "5", label: "Services told as chapters", icon: "layers" },
      { value: "Instant", label: "First paint, no data wait", icon: "zap" },
      { value: "100%", label: "Prerendered before request", icon: "gauge" },
    ],
    challenges: [
      {
        title: "One domain, two applications",
        content: `Visitors should never feel the boundary between the marketing site and the shop, but the two are separate apps with separate release cycles.

A multi-zone setup solved it — until cross-zone navigation silently broke. Vercel rewrites RSC segment-prefetch requests *before* \`afterFiles\` rules run, so every prefetch across the boundary 404'd. Moving the proxy into \`beforeFiles\` puts it ahead of that transform.`,
      },
      {
        title: "Pacing, not scrolling",
        content: `Five services as stacked sections is a list to skim. Instead each pillar pins to the viewport while its imagery moves independently, so scrolling turns a page rather than covering distance.

The trade-off, stated plainly: pinned layouts live inside a \`position: fixed\` wrapper, so the document is an empty spacer. Anything expecting a tall page — crawlers, screenshot tools — sees blank space. Mitigated with server-rendered markup and structured data so machines read the content, not the scroll position.`,
      },
      {
        title: "Motion that stays cheap",
        content: `Scenes pin rather than duplicate, keeping the DOM small. Imagery runs through the Next image pipeline, and every reveal is gated behind an intersection observer so nothing animates off-screen.

The page ships as a static shell with no data fetching on the critical path — which is why it paints immediately rather than after a round-trip.`,
      },
    ],
    gallery: [
      {
        src: img("landing-homepage-full"),
        alt: "Full Webline Technologies homepage, header to footer",
        caption: "The complete page, top to bottom",
        galleryType: "feature",
        width: 1400,
        height: 7876,
        deviceType: "full-width",
      },
      {
        src: img("landing-scene-01"),
        alt: "Hero — 'Technology that keeps business moving' with drifting image collage",
        caption: "Hero: an animated collage assembles as the page settles",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("landing-scene-02"),
        alt: "Infrastructure chapter — resilient networks",
        caption: "Each service pillar pins as a full-bleed chapter",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("landing-scene-04"),
        alt: "Connected security chapter",
        caption: "Imagery moves behind pinned copy as you scroll",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("landing-scene-06"),
        alt: "Positioning statement",
        caption: "The argument, stated once, in full",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("landing-scene-09"),
        alt: "Leadership quote section",
        caption: "Leadership quote closes the narrative",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("landing-scene-10"),
        alt: "Closing section and footer",
        caption: "'Built for today, ready for what's next' — closing and footer",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
    ],
  },
  {
    projectId: "webline-store",
    details: {
      heroImage: img("store-01-hero"),
      heroAlt: "Webline Store homepage hero",
      tagline: "A catalogue that loads before you finish clicking",
      client: "Webline Technologies Ltd.",
      industry: "E-commerce / Technology Retail",
      period: "2026",
      year: 2026,
      services: [
        "Full-Stack Engineering",
        "Edge Architecture",
        "Performance Engineering",
        "Design Systems",
        "Payments Integration",
        "Search & Merchandising",
      ],
      features: [
        "Partial prerendering with tag-driven invalidation",
        "Dynamic variant system — any option type, not just size/colour",
        "Server-driven faceted search with cross-narrowed counts",
        "Anonymous carts that merge on sign-in",
        "Atomic inventory reservation at checkout",
        "M-Pesa, Paystack and PayPal payment paths",
      ],
      colorPalette: [
        { hex: "#FFFFFF", name: "Paper" },
        { hex: "#0B0B0B", name: "Ink" },
        { hex: "#1D4ED8", name: "Action Blue" },
        { hex: "#F4F4F5", name: "Surface" },
      ],
      relatedProjectIds: ["webline-technologies"],
      fullDescription: `## Overview

The storefront for Webline Technologies — a commerce platform on Cloudflare's edge, sharing a domain with the corporate site but running as its own application.

Two priorities: a catalogue that feels instant, and one that stays correct when stock and prices change.

## Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (Cache Components), React 19 |
| **API** | Hono + oRPC on Cloudflare Workers |
| **Database** | D1 (SQLite) + Drizzle |
| **Caching** | Edge KV, \`use cache\`, TanStack Query |
| **Async** | Queues — orders, stock, cart recovery |
| **Auth** | Better Auth — 2FA, passkeys, anonymous sessions |

## Recommendations that read the room

Three signals — content similarity, collaborative behaviour (viewed, added and purchased together) and the shopper's own category preferences — are blended per placement, because the right suggestion depends on where you are:

| Placement | Content | Collaborative | Preference |
|-----------|---------|---------------|------------|
| Product page | 0.45 | 0.45 | 0.10 |
| Homepage | 0.20 | 0.30 | 0.50 |
| **Cart** | **0.00** | 0.70 | 0.30 |

Cart drops content similarity to zero on purpose. Someone buying a laptop doesn't want a second laptop — they want the dock and the warranty. Every suggestion carries a reason, and impressions and clicks are tracked so the weights can be argued with rather than guessed at.

## Variants without assumptions

Variants aren't hard-coded to size and colour. Each carries an arbitrary options object, and the dimensions a product has are derived from its data — so RAM, storage or ink configuration need a new row, not a schema migration.

## Commerce mechanics

Anonymous shoppers get a real server-side cart that merges into their account on sign-up. Stock is reserved atomically at checkout, so two people racing for the last unit resolve deterministically.`,
    },
    metrics: [
      { value: "30×", label: "Faster catalogue search", icon: "search" },
      { value: "Instant", label: "Browsing between products", icon: "mouse-pointer-click" },
      { value: "0", label: "Carts lost at sign-up", icon: "shopping-cart" },
    ],
    challenges: [
      {
        title: "Recommending the right thing, not the similar thing",
        content: `A single similarity score gives you the same answer everywhere — and on a cart page that means offering a second laptop to someone already buying one.

Three signals are blended instead, with weights per placement. Cart sets content similarity to **zero** and leans on what people actually buy together; the homepage leans on the shopper's own history. Every suggestion carries a reason, and impressions and clicks are tracked so the mix can be tuned against evidence.`,
      },
      {
        title: "A catalogue that feels instant",
        content: `Browsing dies on latency. Every route is a prerendered shell and the whole catalogue is generated ahead of time, so moving between products needs no API call at all.

The result is quick enough that the loading skeleton never appears — not a missing state, the intended one.`,
      },
      {
        title: "Fast and correct, not one or the other",
        content: `Long cache lifetimes make a catalogue quick and wrong; short ones keep it honest and slow.

Freshness was decoupled from time. Every cached read is tagged, and an edit in the dashboard invalidates exactly what it touched — immediately — so lifetimes exist only as a backstop. Search went from 715ms to 24ms with edits still landing instantly. Where correctness truly matters, stock is re-checked atomically at order time, so a stale badge can't oversell.`,
      },
      {
        title: "Carts before customers",
        content: `Demanding sign-in before an add-to-cart costs sales; discarding the cart at sign-up costs trust.

Anonymous shoppers get a real server-side cart tied to an HTTP-only session — no localStorage, one source of truth. On sign-up it merges into the account, quantities summed and capped at available stock, and a merge failure never blocks the sign-up itself.`,
      },
    ],
    gallery: [
      {
        src: img("store-homepage-full"),
        alt: "Full Webline Store homepage, header to footer",
        caption: "The complete homepage, top to bottom",
        galleryType: "feature",
        width: 1400,
        height: 4776,
        deviceType: "full-width",
      },
      {
        src: img("store-01-hero"),
        alt: "Webline Store homepage hero and category tiles",
        caption: "Hero carousel over a six-category grid",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("store-09-product-detail"),
        alt: "Product detail page with gallery, key features and specifications",
        caption: "Product detail — gallery, features, full specification table",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("store-13-catalogue"),
        alt: "Full product catalogue with faceted filters",
        caption: "Catalogue with server-driven faceted search",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: img("store-10-goes-great-with"),
        alt: "'Goes great with' recommendation module",
        caption: "Recommendations with inline variant selection and add-to-cart",
        galleryType: "stack",
        width: 1552,
        height: 796,
        deviceType: "tablet",
      },
      {
        src: img("store-03-mega-menu"),
        alt: "Store navigation mega menu open",
        caption: "Category navigation",
        galleryType: "stack",
        width: 2400,
        height: 620,
        deviceType: "desktop",
      },
      {
        src: img("store-07-product-card"),
        alt: "Product card hover state revealing quick add",
        caption: "Product card reveals quick-add on hover",
        galleryType: "stack",
        width: 860,
        height: 1144,
        deviceType: "mobile",
      },
    ],
  },
  {
    projectId: "therapy-in-kenya",
    details: {
      heroImage: timg("therapy-home"),
      heroAlt: "Therapy in Kenya homepage — 'A safe space to talk and heal'",
      tagline: "Booking a first session should be the easy part",
      client: "Private counselling practice, Nairobi",
      industry: "Healthcare / Mental Health",
      period: "2026",
      year: 2026,
      services: [
        "Product & Booking Flow Design",
        "Full-Stack Engineering",
        "Payments Integration (M-Pesa)",
        "SMS & Email Automation",
        "Multi-Tenant Architecture",
        "Realtime Systems",
      ],
      features: [
        "Four-step guest booking — no account required",
        "M-Pesa STK push with idempotent callbacks",
        "Automated SMS and email reminders",
        "Google Calendar sync per practice",
        "Realtime dashboard over WebSockets",
        "Multi-tenant with enforced isolation",
      ],
      colorPalette: [
        { hex: "#2C3E50", name: "Deep Slate" },
        { hex: "#EDE8E0", name: "Warm Sand" },
        { hex: "#E8552A", name: "Accent Coral" },
        { hex: "#FFFFFF", name: "Paper" },
      ],
      relatedProjectIds: ["webline-store", "webline-technologies"],
      fullDescription: `## Overview

A booking and practice-management platform for a Nairobi counsellor. Someone looking for help is rarely in the mood to create an account — so the whole flow is built around booking as a guest in four short steps, then paying with the phone already in their hand.

Behind the public site sits a private dashboard for the practitioner and a Cloudflare Worker API shared by both.

## Architecture

| Layer | Technology |
|-------|------------|
| **Public site** | Next.js — booking, services, articles |
| **Dashboard** | Next.js — schedule, clients, payments |
| **API** | tRPC on Cloudflare Workers |
| **Database** | D1 (SQLite) + Drizzle |
| **Realtime** | Durable Object per practice, WebSocket Hibernation |
| **Payments** | M-Pesa Daraja (STK push) |
| **Messaging** | Africa's Talking SMS, Resend email |

## Booking without accounts

Choose a session type, pick a time, leave contact details, pay. Guests get a signed access link instead of a password, so they can manage the appointment later without ever registering.

## Paid for by phone

M-Pesa STK push prompts the client's handset directly. Daraja callbacks arrive more than once and out of order, so payment state is keyed on the checkout request and applied idempotently — a duplicate callback is a no-op, not a double charge.

## Reminders that don't double-send

A scheduled job sweeps upcoming appointments and sends SMS and email reminders. Overlapping runs are explicitly covered by tests, because a reminder job that fires twice is a message the client reads twice.`,
    },
    metrics: [
      { value: "4 steps", label: "From landing page to booked", icon: "calendar-check" },
      { value: "No account", label: "Required to book or pay", icon: "user-x" },
      { value: "M-Pesa", label: "Paid on the phone in hand", icon: "smartphone" },
    ],
    challenges: [
      {
        title: "Two people, one slot",
        content: `Two guests can hit the same 10:00 slot in the same second. A "is this taken?" check before writing is a race, not a guard — it just narrows the window.

The application still does that check, because it produces a friendly message. Correctness comes from a **partial unique index** on organisation, date and time, scoped to active statuses only. The database refuses the second booking outright, and because the constraint ignores cancelled rows, a freed slot becomes bookable again with no cleanup job.`,
      },
      {
        title: "Payment callbacks you don't control",
        content: `M-Pesa's Daraja API delivers callbacks more than once, sometimes out of order, occasionally long after the client has closed the tab.

Payment state is therefore keyed on the checkout request rather than assembled from the sequence of callbacks, and every transition is idempotent — replaying a callback changes nothing. Duplicate callbacks and out-of-order state changes are both covered by integration tests running against an isolated D1 instance.`,
      },
      {
        title: "A live dashboard without polling",
        content: `The practitioner's dashboard should show a new booking the moment it lands, without hammering the database on an interval.

Each practice gets its own Durable Object acting as a notification hub. Producers send a lightweight poke, connected dashboards refetch authoritatively. It uses the **WebSocket Hibernation API**, so idle connections stay open without holding the object in memory — you pay for events, not for how long someone leaves the tab open.`,
      },
      {
        title: "One codebase, separate practices",
        content: `The platform is multi-tenant, and in a mental-health context a leak between tenants is not a bug you get to explain away.

Every table carries an organisation, every query is scoped to it, and tenant isolation is asserted in the integration suite alongside the payment and booking cases rather than left to code review.`,
      },
    ],
    gallery: [
      {
        src: timg("therapy-homepage-full"),
        alt: "Full Therapy in Kenya homepage, header to footer",
        caption: "The complete homepage, top to bottom",
        galleryType: "feature",
        width: 1400,
        height: 5924,
        deviceType: "full-width",
      },
      {
        src: timg("therapy-home"),
        alt: "Homepage hero — 'A safe space to talk and heal'",
        caption: "A deliberately calm first impression",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: timg("therapy-booking"),
        alt: "Four-step booking wizard with session types and pricing",
        caption: "Step one of four — session type, format and price up front",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: timg("therapy-services"),
        alt: "Counselling services page",
        caption: "Services, explained without clinical jargon",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: timg("therapy-find-help"),
        alt: "Find help for — routing by concern",
        caption: "Routing visitors by what they're facing",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
      {
        src: timg("therapy-articles"),
        alt: "Articles and reflections listing",
        caption: "Long-form reflections build trust before the first session",
        galleryType: "stack",
        width: 2400,
        height: 1350,
        deviceType: "desktop",
      },
    ],
  },
];
