import { describe, expect, it } from "vitest";

import { redactFreeText, sanitizeFrameLocation, sanitizeUrl, scrubUrlProperties } from "./url";

describe("sanitizeUrl", () => {
  it("keeps only allowlisted query parameters", () => {
    expect(
      sanitizeUrl(
        "https://www.geraldbahati.dev/projects?utm_source=x&access_token=abc&Email=a%40b.c&page=2",
      ),
    ).toBe("https://www.geraldbahati.dev/projects?utm_source=x&page=2");
  });

  it("matches parameter names exactly, so case variants are dropped", () => {
    expect(sanitizeUrl("https://example.com/?UTM_SOURCE=x&Token=y")).toBe("https://example.com/");
  });

  it("removes credentials and fragments", () => {
    expect(sanitizeUrl("https://user:pass@example.com/cb#access_token=secret")).toBe(
      "https://example.com/cb",
    );
  });

  it("reduces non-HTTP destinations to their scheme", () => {
    expect(sanitizeUrl("mailto:someone@example.com?subject=hi")).toBe("mailto:");
    expect(sanitizeUrl("tel:+254700000000")).toBe("tel:");
  });

  it("keeps relative destinations relative", () => {
    expect(sanitizeUrl("/contact?email=a@b.c&ref=footer#form")).toBe("/contact?ref=footer");
  });

  it("rejects values that are not URLs", () => {
    expect(sanitizeUrl("not a url")).toBeUndefined();
    expect(sanitizeUrl(42)).toBeUndefined();
    expect(sanitizeUrl("")).toBeUndefined();
  });

  it("falls back to origin and path when the query would exceed the bound", () => {
    const long = `https://example.com/a?utm_source=${"x".repeat(3_000)}`;
    expect(sanitizeUrl(long)).toBe("https://example.com/a");
  });
});

describe("scrubUrlProperties", () => {
  it("scrubs known URL keys, including nested person properties", () => {
    const result = scrubUrlProperties({
      $current_url: "https://example.com/?token=1&utm_medium=email",
      $referrer: "https://ref.example/?secret=1",
      destination: "https://out.example/path?key=1",
      $set: { $initial_current_url: "https://example.com/?password=1" },
      label: "untouched?token=1",
    });

    expect(result).toEqual({
      $current_url: "https://example.com/?utm_medium=email",
      $referrer: "https://ref.example/",
      destination: "https://out.example/path",
      $set: { $initial_current_url: "https://example.com/" },
      label: "untouched?token=1",
    });
  });

  it("drops URL keys whose value cannot be parsed", () => {
    expect(scrubUrlProperties({ $referrer: "$direct" })).toEqual({});
  });

  it("does not mutate its input", () => {
    const input = { $current_url: "https://example.com/?token=1" };
    scrubUrlProperties(input);
    expect(input.$current_url).toBe("https://example.com/?token=1");
  });
});

describe("redactFreeText", () => {
  it("redacts email addresses and bounds length", () => {
    expect(redactFreeText("Duplicate key for Sender@Example.com")).toBe(
      "Duplicate key for [email]",
    );
    expect(redactFreeText("x".repeat(20), 10)).toBe(`${"x".repeat(9)}…`);
  });

  it("scrubs URLs embedded in messages with the page-URL allowlist", () => {
    expect(
      redactFreeText("Callback failed for https://x.dev/cb?access_token=SECRET&page=2#id_token=X."),
    ).toBe("Callback failed for https://x.dev/cb?page=2.");
  });

  it("redacts credential assignments, bearer tokens, and JWTs", () => {
    const redacted = redactFreeText(
      "token=SECRET1 api_key=SECRET2 sent Bearer abcdefghijk with " +
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl",
    );
    expect(redacted).toBe("token=[redacted] api_key=[redacted] sent Bearer [redacted] with [jwt]");
  });

  it.each([
    [
      "JSON with quoted keys and values",
      '{"password":"secret","access_token":"secret","page":2}',
      '{"password":"[redacted]","access_token":"[redacted]","page":2}',
    ],
    ["a quoted value containing spaces", 'password: "secret phrase"', 'password: "[redacted]"'],
    ["single quotes", "{'secret': 'two words'}", "{'secret': '[redacted]'}"],
    [
      "escaped quotes inside a quoted value",
      'password: "se\\"cret" next',
      'password: "[redacted]" next',
    ],
    [
      "JSON serialized inside a string",
      '{\\"password\\":\\"secret phrase\\"}',
      '{\\"password\\":\\"[redacted]\\"}',
    ],
    [
      "a value cut off by truncation",
      'body: {"password":"secret phr',
      'body: {"password":"[redacted]',
    ],
    [
      "prefixed field names",
      "db_password=x x-api-key: y",
      "db_password=[redacted] x-api-key: [redacted]",
    ],
    ["numeric JSON values", '{"pin_password": 123456}', '{"pin_password": [redacted]}'],
    ["a cookie header list", "Cookie: a=1; session=2", "Cookie: [redacted]"],
    ["an authorization header", "Authorization: Basic dXNlcjpwYXNz", "Authorization: [redacted]"],
  ])("redacts credentials in %s", (_shape, input, expected) => {
    expect(redactFreeText(input)).toBe(expected);
  });

  it("stays fast on adversarial input", () => {
    const hostile = [
      `password: "${"\\".repeat(4_000)}`,
      `{"token":"${"x".repeat(8_000)}`,
      "password=".repeat(1_000),
      `Cookie: ${"a=1; ".repeat(2_000)}`,
    ];
    const started = performance.now();
    for (const input of hostile) redactFreeText(input);
    expect(performance.now() - started).toBeLessThan(100);
  });

  it("leaves words that merely contain a credential name alone", () => {
    for (const text of ["max_tokens: 4096", "tokenizer=bpe", "session expired: sign in again"]) {
      expect(redactFreeText(text)).toBe(text);
    }
  });

  it("keeps ordinary diagnostic text intact", () => {
    const message = "Cannot read properties of undefined (reading 'id') at status 500";
    expect(redactFreeText(message)).toBe(message);
  });
});

describe("sanitizeFrameLocation", () => {
  it("drops the query, fragment, and credentials from frame URLs", () => {
    expect(
      sanitizeFrameLocation("https://user:pw@www.geraldbahati.dev/contact?token=SECRET#x"),
    ).toBe("https://www.geraldbahati.dev/contact");
  });

  it("cuts bare module names at a query and bounds length", () => {
    expect(sanitizeFrameLocation("index.js?token=SECRET")).toBe("index.js");
    expect(sanitizeFrameLocation(`https://x.dev/${"a".repeat(2_000)}`)).toHaveLength(1_024);
  });
});
