// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowserExceptionPayload } from "./report";

const fetchMock = vi.fn<typeof fetch>();

function errorFrom(location: string, message = "Cannot read properties of undefined") {
  const error = new TypeError(message);
  error.stack = `TypeError: ${message}\n    at handler (https://www.geraldbahati.dev/_astro/${location})`;
  return error;
}

async function reporter() {
  vi.resetModules();
  const module = await import("./browser");
  module.installBrowserErrorReporter({ endpoint: "/monitoring" });
  return module;
}

async function sentPayloads() {
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  // Let any fallback request settle as well.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return fetchMock.mock.calls.map(
    ([, init]) => JSON.parse(String(init?.body)) as BrowserExceptionPayload,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser error reporter", () => {
  it("reports the same message from two call sites separately", async () => {
    const { captureBrowserException } = await reporter();
    captureBrowserException(errorFrom("gallery.js:10:5"));
    captureBrowserException(errorFrom("contact.js:42:7"));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("collapses repeats of the same error from the same frame", async () => {
    const { captureBrowserException } = await reporter();
    captureBrowserException(errorFrom("gallery.js:10:5"));
    captureBrowserException(errorFrom("gallery.js:10:5"));

    expect(await sentPayloads()).toHaveLength(1);
  });

  it("treats the operation as part of a report's identity", async () => {
    const { captureBrowserException } = await reporter();
    captureBrowserException(errorFrom("forms.js:3:1"), { operation: "contact.submit" });
    captureBrowserException(errorFrom("forms.js:3:1"), { operation: "newsletter.submit" });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("resends without stack traces when the relay rejects a report", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const { captureBrowserException } = await reporter();
    captureBrowserException(errorFrom("gallery.js:10:5"));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [original, fallback] = await sentPayloads();
    expect(original?.properties.$exception_list[0]?.stacktrace).toBeDefined();
    expect(fallback?.properties.$exception_list[0]).not.toHaveProperty("stacktrace");
    expect(fallback?.properties.$exception_list[0]?.value).toBe(
      "Cannot read properties of undefined",
    );
  });
});
