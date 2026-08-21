import { marked } from "marked";

const ALLOWED_TAGS = new Set([
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
]);

export function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, name: string) => {
      const lower = name.toLowerCase();
      if (!ALLOWED_TAGS.has(lower)) {
        return "";
      }
      if (lower === "a") {
        const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
        if (!href || href.startsWith("javascript:")) {
          return tag.startsWith("</") ? "</a>" : "<a>";
        }
        const safe =
          href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/");
        if (!safe) {
          return tag.startsWith("</") ? "</a>" : "<a>";
        }
        return tag.startsWith("</")
          ? "</a>"
          : `<a href="${href.replaceAll('"', "&quot;")}" rel="noopener noreferrer">`;
      }
      return tag.startsWith("</") ? `</${lower}>` : `<${lower}>`;
    })
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "");
}

export function renderMarkdown(source: string | null | undefined) {
  if (!source?.trim()) {
    return "";
  }

  const html = marked.parse(source, { gfm: true, breaks: false, async: false }) as string;
  return sanitizeHtml(html);
}
