import { PRIVATE_PATH_PREFIXES } from "../http/cache";
import { SITE_URL } from "./site";

/**
 * Every AI crawler is allowed, deliberately. The usual posture blocks training
 * bots to protect proprietary content; this site has none, and being in the
 * weights is the point. Named explicitly despite the wildcard so a later
 * `Disallow: *` cannot silently change the answer.
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
