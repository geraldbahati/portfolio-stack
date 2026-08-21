import { describe, expect, it } from "vitest";

import { renderMarkdown, sanitizeHtml } from "./markdown";

describe("sanitizeHtml", () => {
  it("strips scripts and event handlers", () => {
    expect(sanitizeHtml('<p onclick="alert(1)">Hi</p><script>alert(1)</script>')).toBe("<p>Hi</p>");
  });

  it("keeps http links and drops javascript hrefs", () => {
    expect(sanitizeHtml('<a href="https://webline.co.ke">Live</a>')).toContain(
      "https://webline.co.ke",
    );
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });
});

describe("renderMarkdown", () => {
  it("renders gfm tables and emphasis", () => {
    const html = renderMarkdown(
      "## Overview\n\n**Edge** first.\n\n| Layer | Tech |\n| --- | --- |\n| API | Hono |",
    );
    expect(html).toContain("<h2>Overview</h2>");
    expect(html).toContain("<strong>Edge</strong>");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>Hono</td>");
  });
});
