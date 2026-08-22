import { marked } from "marked";

export interface PrivacyPolicySection {
  id: string;
  title: string;
  html: string;
}

export function parsePrivacyPolicy(source: string): PrivacyPolicySection[] {
  return source
    .trim()
    .split(/\n(?=##\s)/)
    .slice(1)
    .map((section, index) => {
      const [headingLine = "", ...contentLines] = section.split("\n");
      const title = headingLine.replace(/^##\s+/, "").trim();
      const label = title.replace(/^\d+\.\s*/, "");
      const slug = label
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      return {
        id: `section-${index + 1}-${slug}`,
        title,
        html: marked.parse(contentLines.join("\n").trim(), {
          async: false,
          breaks: false,
          gfm: true,
        }) as string,
      };
    });
}
