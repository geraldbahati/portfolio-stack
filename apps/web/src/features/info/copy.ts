export const SERVICES_DIVIDER = {
  label: "SERVICES IN DETAIL",
  counter: "(02)",
} as const;

export const SERVICE_SECTIONS = [
  {
    id: "frontend",
    label: "FRONTEND",
    title: "Frontend Engineering",
    description:
      "I build fast, interactive interfaces using React 19 and Next.js 16 — optimized for Core Web Vitals and shipped with edge-first rendering.",
    bullets: [
      "React 19 & Next.js 16 with App Router",
      "TypeScript-first component architecture",
      "Scroll-driven animations (Framer Motion, GSAP)",
      "Core Web Vitals & performance tuning",
      "Design system implementation",
    ],
  },
  {
    id: "backend",
    label: "BACKEND",
    title: "Backend & APIs",
    description:
      "I design type-safe APIs and data layers that handle real traffic — from oRPC procedure routers to payment flows with M-Pesa and Stripe.",
    bullets: [
      "Node.js, Spring Boot, Go, Django",
      "Type-safe APIs (oRPC, REST, GraphQL)",
      "PostgreSQL, MongoDB, Convex, D1",
      "Payment integration (M-Pesa, Stripe)",
      "Rate limiting, validation & error handling",
    ],
  },
  {
    id: "infrastructure",
    label: "INFRASTRUCTURE",
    title: "Cloud & DevOps",
    description:
      "I deploy on Cloudflare and AWS with multi-layer caching, containerized services, and CI/CD pipelines that keep deploys fast and reliable.",
    bullets: [
      "Cloudflare Workers, KV, R2, Queues",
      "AWS infrastructure & S3",
      "Docker containerization",
      "CI/CD pipeline automation",
      "Monitoring, logging & alerting",
    ],
  },
  {
    id: "ai",
    label: "AI & REALTIME",
    title: "AI & Real-Time Systems",
    description:
      "I integrate LLMs into product features and build real-time systems with WebSockets — from recommendation engines to live collaboration tools.",
    bullets: [
      "LLM integration & prompt engineering",
      "Vector search & recommendation engines",
      "WebSocket & Redis Pub/Sub architecture",
      "Generative UI components",
      "Event-driven microservices",
    ],
  },
] as const;

export type ServiceId = (typeof SERVICE_SECTIONS)[number]["id"];

export const CLOSING_LEAD = "Product Engineering";
export const CLOSING_BODY =
  " is about shipping solutions that matter. I focus on the intersection of performance, reliability, and user experience — building systems that are fast to use, fast to ship, and built to scale.";
