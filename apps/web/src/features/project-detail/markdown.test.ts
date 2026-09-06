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

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java&#x73;cript:alert(1)",
    "java&#9;script:alert(1)",
    "&#106;avascript:alert(1)",
    "data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;",
    "vbscript:alert(1)",
  ])("rejects encoded and unsafe link destinations: %s", (href) => {
    expect(sanitizeHtml(`<a href="${href}">Link</a>`)).toBe("<a>Link</a>");
  });

  it("parses quoted angle brackets and removes unquoted handlers", () => {
    expect(
      sanitizeHtml('<p title=">" onclick=alert(1)><strong onmouseover=alert(2)>Hi</strong></p>'),
    ).toBe("<p><strong>Hi</strong></p>");
  });

  it("removes executable markup, script content, comments and unwanted attributes", () => {
    expect(
      sanitizeHtml(
        '<!-- hidden --><p id="x" class="x" style="color:red">Hi</p><script>alert(1)</script><style>body{display:none}</style><iframe srcdoc="bad">hidden</iframe><img src=x onerror=alert(1)>',
      ),
    ).toBe("<p>Hi</p>hidden");
  });

  it("keeps link destinations and escaped code without creating attributes", () => {
    expect(
      sanitizeHtml(
        '<a href="/projects/demo?x=1&amp;y=2" target="_blank">Local</a><a href="https://example.com/&quot;onclick=&quot;alert(1)">Remote</a><pre><code>&lt;img src=x onerror=alert(1)&gt;</code></pre>',
      ),
    ).toBe(
      '<a href="/projects/demo?x=1&amp;y=2" rel="noopener noreferrer">Local</a><a href="https://example.com/&quot;onclick=&quot;alert(1)" rel="noopener noreferrer">Remote</a><pre><code>&lt;img src=x onerror=alert(1)&gt;</code></pre>',
    );
  });

  it.each(["#overview", "mailto:hello@example.com", "relative/page"])(
    "preserves the existing policy for unsupported links: %s",
    (href) => {
      expect(sanitizeHtml(`<a href="${href}">Link</a>`)).toBe("<a>Link</a>");
    },
  );
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

  it("preserves the document structure used by project prose", () => {
    expect(
      renderMarkdown(
        "### Details\n\nA *small* improvement with `code`.\n\n- First\n- Second\n\n> A quote\n\n```js\nconst value = 1;\n```\n\n[Project](/projects/demo)",
      ),
    ).toBe(
      '<h3>Details</h3>\n<p>A <em>small</em> improvement with <code>code</code>.</p>\n<ul>\n<li>First</li>\n<li>Second</li>\n</ul>\n<blockquote>\n<p>A quote</p>\n</blockquote>\n<pre><code>const value = 1;\n</code></pre>\n<p><a href="/projects/demo" rel="noopener noreferrer">Project</a></p>\n',
    );
  });

  it.each([null, undefined, "", " \n\t"])("keeps empty content empty: %s", (source) => {
    expect(renderMarkdown(source)).toBe("");
  });
});
