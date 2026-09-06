import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listPublished, getBySlug, captureException } = vi.hoisted(() => ({
  listPublished: vi.fn(),
  getBySlug: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("./orpc", () => ({ orpc: { projects: { listPublished, getBySlug } } }));
vi.mock("@sentry/astro", () => ({ captureException }));

import { loadPublishedProject, loadPublishedProjects } from "./projects";
import { clearPublicCache } from "./public-cache";
import { PublicDataUnavailableError, serviceUnavailable } from "./public-request";

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  clearPublicCache();
});
afterEach(() => vi.useRealTimers());

describe("public project requests", () => {
  it("distinguishes a real missing project from a service failure", async () => {
    getBySlug.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("offline"));
    expect(await loadPublishedProject("missing")).toBeNull();
    await expect(loadPublishedProject("existing")).rejects.toBeInstanceOf(
      PublicDataUnavailableError,
    );
    expect(captureException).toHaveBeenCalledOnce();
  });

  it("does not turn list outages into an empty successful response", async () => {
    listPublished.mockRejectedValue(new Error("offline"));
    await expect(loadPublishedProjects()).rejects.toBeInstanceOf(PublicDataUnavailableError);
  });

  it("aborts a timed-out RPC and clears its timeout on success", async () => {
    let signal: AbortSignal | undefined;
    getBySlug.mockImplementation((_input, options) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const request = expect(loadPublishedProject("slow")).rejects.toBeInstanceOf(
      PublicDataUnavailableError,
    );
    await vi.advanceTimersByTimeAsync(4000);
    await request;
    expect(signal?.aborted).toBe(true);
    getBySlug.mockResolvedValue(null);
    expect(await loadPublishedProject("fast")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps recent successful data during an outage but bounds staleness", async () => {
    listPublished
      .mockResolvedValueOnce([{ id: "existing" }])
      .mockRejectedValue(new Error("offline"));
    expect(await loadPublishedProjects()).toEqual([{ id: "existing" }]);
    await vi.advanceTimersByTimeAsync(61_000);
    expect(await loadPublishedProjects()).toEqual([{ id: "existing" }]);
    expect(captureException).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(300_000);
    await expect(loadPublishedProjects()).rejects.toBeInstanceOf(PublicDataUnavailableError);
  });

  it("preserves error page markup and emits an uncached retryable HTTP status", async () => {
    const response = serviceUnavailable(
      new Response("existing error UI", { headers: { "Cache-Control": "public" } }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.text()).toBe("existing error UI");
  });
});
