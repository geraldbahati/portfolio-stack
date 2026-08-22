import { PRIVATE_PATH_PREFIXES } from "../http/cache";
import { SITE_URL } from "./site";

/**
 * Every AI crawler is allowed, deliberately.
 *
 * The common 2026 posture is to allow retrieval bots (OAI-SearchBot,
 * Claude-SearchBot, PerplexityBot) and block training bots (GPTBot,
 * ClaudeBot, Google-Extended). That trade protects proprietary content — and
 * this site has none. It is a portfolio whose whole purpose is for a stranger
 * to learn the name, so being in the weights is the point, not the cost.
 *
 * They are listed explicitly even though the wildcard group already permits
 * them: a named group means a later `Disallow` under `*` cannot silently
 * change the answer, and it makes the intent legible in CDN logs.
 */
export const AI_AGENTS = [
  // OpenAI: training, search index, and on-demand user fetch.
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic.
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  // Perplexity.
  "PerplexityBot",
  "Perplexity-User",
  // Gemini / AI Overviews grounding, and Apple Intelligence.
  "Google-Extended",
  "Applebot-Extended",
  // Common Crawl feeds most open training sets.
  "CCBot",
  "Amazonbot",
  "Meta-ExternalAgent",
] as const;

export function renderRobotsTxt(): string {
  const disallow = PRIVATE_PATH_PREFIXES.map((prefix) => `Disallow: ${prefix}`).join("\n");
  const group = (userAgent: string) => `User-agent: ${userAgent}\nAllow: /\n${disallow}`;

  return `# ${SITE_URL}/robots.txt
# The bare apex 301s to this host; only www serves content.

${group("*")}

# AI answer engines and training crawlers — allowed on purpose. See /llms.txt.
${AI_AGENTS.map(group).join("\n\n")}

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${new URL(SITE_URL).host}
`;
}
