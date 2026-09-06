import { marked } from "marked";
import sanitize from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "a",
  "code",
  "pre",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "br",
];

export function sanitizeHtml(html: string) {
  return sanitize(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "rel"] },
    allowedSchemes: ["http", "https"],
    parseStyleAttributes: false,
    transformTags: {
      a: (tagName, attributes) => {
        const href = attributes.href ?? "";
        const allowed =
          href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/");
        const attribs: Record<string, string> = allowed ? { href, rel: "noopener noreferrer" } : {};
        return {
          tagName,
          attribs,
        };
      },
    },
  });
}

export function renderMarkdown(source: string | null | undefined) {
  if (!source?.trim()) {
    return "";
  }

  const html = marked.parse(source, { gfm: true, breaks: false, async: false }) as string;
  return sanitizeHtml(html);
}
