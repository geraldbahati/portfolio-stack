import { describe, expect, it } from "vitest";

import { buildExceptionProperties } from "./exception";
import { browserExceptionReportSchema, parseBrowserExceptionReport } from "./report";

const valid = {
  distinct_id: "page-1",
  timestamp: "2026-10-04T12:00:00.000Z",
  properties: {
    $exception_list: [
      {
        type: "TypeError",
        value: "x is undefined",
        mechanism: { handled: false, type: "onuncaughtexception", synthetic: false },
        stacktrace: {
          type: "raw",
          frames: [
            {
              platform: "web:javascript",
              filename: "https://www.geraldbahati.dev/_astro/page.js",
              function: "boot",
              lineno: 1,
              colno: 20,
              in_app: true,
            },
          ],
        },
      },
    ],
    $exception_level: "error",
    $current_url: "https://www.geraldbahati.dev/contact?email=a@b.c&utm_source=x#t",
  },
};

describe("parseBrowserExceptionReport", () => {
  it("accepts a well-formed report and re-scrubs its URL", () => {
    const report = parseBrowserExceptionReport(valid);
    expect(report?.properties.$current_url).toBe(
      "https://www.geraldbahati.dev/contact?utm_source=x",
    );
    expect(report?.properties.$exception_list).toHaveLength(1);
  });

  it("rejects properties the relay does not expect", () => {
    expect(
      parseBrowserExceptionReport({
        ...valid,
        properties: { ...valid.properties, $set: { email: "a@b.c" } },
      }),
    ).toBeNull();
  });

  it("rejects attempts to relay a different event", () => {
    expect(parseBrowserExceptionReport({ ...valid, event: "$pageview" })).toBeNull();
  });

  it("rejects oversized exception chains", () => {
    const exceptions = Array.from({ length: 6 }, () => valid.properties.$exception_list[0]);
    expect(
      parseBrowserExceptionReport({
        ...valid,
        properties: { ...valid.properties, $exception_list: exceptions },
      }),
    ).toBeNull();
  });

  it("drops a URL that cannot be parsed instead of relaying it", () => {
    const report = parseBrowserExceptionReport({
      ...valid,
      properties: { ...valid.properties, $current_url: "not a url" },
    });
    expect(report?.properties).not.toHaveProperty("$current_url");
  });
});

describe("builder output through the relay", () => {
  function hostileError() {
    const error = new Error(
      "Callback failed for https://x.dev/cb?access_token=SECRET1 with token=SECRET2",
    );
    // A long minified name, an inline-script frame carrying the page URL and
    // its query, and more frames than the relay accepts.
    error.stack = [
      "Error: Callback failed",
      `    at ${"f".repeat(400)} (https://www.geraldbahati.dev/contact?token=SECRET3:10:5)`,
      ...Array.from(
        { length: 80 },
        (_, index) => `    at fn${index} (https://www.geraldbahati.dev/_astro/a.js:${index + 1}:1)`,
      ),
    ].join("\n");
    return error;
  }

  it("always produces a report the relay schema accepts", () => {
    const exception = buildExceptionProperties(hostileError(), {
      runtime: "browser",
      handled: false,
      mechanism: "onuncaughtexception",
    });
    const result = browserExceptionReportSchema.safeParse({
      distinct_id: "page-1",
      properties: {
        $exception_list: exception.$exception_list,
        $exception_level: exception.$exception_level,
      },
    });
    expect(result.error?.issues).toBeUndefined();
  });

  it("removes credentials from messages and frame locations before sending", () => {
    const serialized = JSON.stringify(
      buildExceptionProperties(hostileError(), { runtime: "browser" }),
    );
    expect(serialized).not.toMatch(/SECRET[123]/);
  });

  it("re-redacts messages and frame locations a client sent unredacted", () => {
    const report = parseBrowserExceptionReport({
      ...valid,
      properties: {
        ...valid.properties,
        $exception_list: [
          {
            type: "Error",
            value: "failed with password=hunter2",
            stacktrace: {
              type: "raw",
              frames: [
                {
                  platform: "web:javascript",
                  filename: "https://www.geraldbahati.dev/reset?token=SECRET4",
                  lineno: 1,
                  colno: 1,
                },
              ],
            },
          },
        ],
      },
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toMatch(/hunter2|SECRET4/);
    expect(report?.properties.$exception_list[0]?.stacktrace?.frames?.[0]?.filename).toBe(
      "https://www.geraldbahati.dev/reset",
    );
  });

  it.each(['{"password":"secret","access_token":"secret"}', 'password: "secret phrase"'])(
    "redacts quoted credentials a client sent in %s",
    (value) => {
      const report = parseBrowserExceptionReport({
        ...valid,
        properties: { ...valid.properties, $exception_list: [{ type: "Error", value }] },
      });
      expect(report?.properties.$exception_list[0]?.value).not.toContain("secret");
      expect(report?.properties.$exception_list[0]?.value).toContain("[redacted]");
    },
  );
});
