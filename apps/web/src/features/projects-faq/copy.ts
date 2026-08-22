export const PROJECTS_DIVIDER = {
  label: "FEATURED PROJECTS",
  counter: "(03)",
} as const;

export const FAQ_DIVIDER = {
  label: "WHY YOU SHOULD WORK WITH ME",
  counter: "(04)",
} as const;

export const PROJECTS_TITLE = "Website Creations and Client Projects";
export const PROJECTS_DESCRIPTION =
  "Get to know me, my work style and my values through an insight into my projects that stand for quality, structure and sustainable solutions.";

export const FAQ_HEADING = "Trust in the expertise";
export const FAQ_INTRO =
  "Honesty and transparency throughout the entire project are essential for success. It's important to define goals and options right from the start.";

export const FAQ_IMAGE_ALT = "Professional consultation meeting";

export type FaqStep = { title: string; body: string };

export type FaqItem = {
  question: string;
  answerText: string;
  steps?: readonly FaqStep[];
};

const PROCESS_STEPS = [
  {
    title: "Understanding the Problem:",
    body: "I start by understanding the business context, user needs, and technical constraints before writing any code.",
  },
  {
    title: "Architecture & Planning:",
    body: "I design the system upfront — data models, API contracts, caching layers — so the team has a clear technical direction.",
  },
  {
    title: "Iterative Delivery:",
    body: "I ship in small, testable increments with regular code reviews and feedback loops.",
  },
  {
    title: "Ownership & Follow-through:",
    body: "I take features from spec to production and stick around for monitoring, performance tuning, and iteration.",
  },
] as const;

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "HOW DOES WORKING WITH YOU LOOK LIKE?",
    answerText:
      "Understanding the Problem: I start by understanding the business context, user needs, and technical constraints before writing any code. Architecture & Planning: I design the system upfront — data models, API contracts, caching layers — so the team has a clear technical direction. Iterative Delivery: I ship in small, testable increments with regular code reviews and feedback loops. Ownership & Follow-through: I take features from spec to production and stick around for monitoring, performance tuning, and iteration.",
    steps: PROCESS_STEPS,
  },
  {
    question: "WHY SHOULD COMPANIES HIRE YOU?",
    answerText:
      "I bring a product-first engineering mindset with production experience across e-commerce, real-time systems, and AI integrations. I don't just write code — I build scalable systems that solve business problems. From edge-first e-commerce platforms with multi-layer caching to M-Pesa payment integrations, I deliver software that drives measurable outcomes.",
  },
  {
    question: "WHAT IS YOUR TECH STACK?",
    answerText:
      "I specialize in TypeScript/React/Next.js for frontend, with backend expertise in Node.js, Spring Boot, Go, and Django. I architect real-time systems using WebSockets and Redis Pub/Sub, and leverage Cloud infrastructure (AWS, Cloudflare) with modern databases (PostgreSQL, MongoDB, Convex). I also integrate AI/LLM capabilities for intelligent product features.",
  },
  {
    question: "WHAT TYPES OF PROJECTS HAVE YOU DELIVERED?",
    answerText:
      "I've shipped production e-commerce platforms with Stripe and M-Pesa payments, fintech applications with secure transaction handling, AI-native collaboration platforms with Generative UI, distributed real-time chat systems supporting 10,000+ concurrent connections with sub-50ms latency, and digital transformation solutions for electoral processes serving 500+ users.",
  },
  {
    question: "ARE YOU OPEN TO REMOTE OR HYBRID ROLES?",
    answerText:
      "Yes. I'm based in Nairobi, Kenya, and I'm open to fully remote positions or hybrid arrangements. I've worked effectively across time zones and async workflows, and I'm comfortable with tools like Slack, Linear, GitHub, and Notion for team collaboration.",
  },
];

export const FAQ_ENTRIES = FAQ_ITEMS.map((item) => ({
  question: item.question,
  answer: item.answerText,
}));
