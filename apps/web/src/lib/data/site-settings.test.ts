import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getPublic, captureException } = vi.hoisted(() => ({
  getPublic: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("./orpc", () => ({ orpc: { settings: { getPublic } } }));
vi.mock("@sentry/astro", () => ({ captureException }));

import { clearPublicCache } from "./public-cache";
import { loadPublicSiteSettings } from "./site-settings";

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  clearPublicCache();
});
afterEach(() => vi.useRealTimers());

describe("public settings resilience", () => {
  it("retains recently configured settings when refreshing fails", async () => {
    const settings = { contactEmail: "owner@example.com" };
    getPublic.mockResolvedValueOnce(settings).mockRejectedValue(new Error("offline"));
    expect(await loadPublicSiteSettings()).toEqual(settings);
    await vi.advanceTimersByTimeAsync(60_001);
    expect(await loadPublicSiteSettings()).toEqual(settings);
    expect(captureException).toHaveBeenCalledOnce();
  });

  it("cancels cold timeouts and falls back to valid defaults without caching them", async () => {
    let signal: AbortSignal | undefined;
    getPublic.mockImplementation((_input, options) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const pending = loadPublicSiteSettings();
    await vi.advanceTimersByTimeAsync(500);
    const defaults = await pending;
    expect(defaults).toBeDefined();
    expect(signal?.aborted).toBe(true);
    expect(captureException).toHaveBeenCalledOnce();
    getPublic.mockResolvedValue({ contactEmail: "recovered@example.com" });
    expect(await loadPublicSiteSettings()).toEqual({ contactEmail: "recovered@example.com" });
  });
});
