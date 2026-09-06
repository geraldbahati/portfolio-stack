// Editorial summaries of the existing public case studies. Keep these aligned
// with the case-study content; new projects fall back to their CMS metadata.
export const PROJECT_SEARCH_COPY: Record<string, { topic: string; description: string }> = {
  "webline-technologies": {
    topic: "Corporate Website",
    description:
      "How I built Webline Technologies' corporate website: a scroll-driven service narrative and multi-zone architecture connecting the site to its storefront.",
  },
  "webline-store": {
    topic: "Cloudflare E-Commerce",
    description:
      "How I built Webline Store on Cloudflare Workers, with partial prerendering, cache invalidation, product variants, and AI-assisted recommendations.",
  },
  "therapy-in-kenya": {
    topic: "M-Pesa Booking Platform",
    description:
      "A counselling booking platform for Nairobi: guest appointments, M-Pesa payments, SMS reminders, and a real-time dashboard on Cloudflare Workers.",
  },
  "webline-dashboard": {
    topic: "E-Commerce Admin",
    description:
      "Inside Webline Dashboard: an e-commerce admin panel with real-time analytics, order lifecycle tracking, and a resilient API gateway.",
  },
  "modern-dashboard": {
    topic: "AI & Generative UI",
    description:
      "How Modern Dashboard turns natural-language queries into interactive React components, with streaming AI responses and analytics built on Next.js and Hono.",
  },
  teamflow: {
    topic: "Real-Time Team Collaboration",
    description:
      "Inside TeamFlow: real-time messaging, threaded conversations, workspace isolation, and AI summaries built with Next.js, Go, Redis, and PostgreSQL.",
  },
};
