import { afterEach, describe, expect, it, vi } from "vitest";

import { clearPublicCache, readPublicCache, withPublicCache } from "./public-cache";

afterEach(() => {
  clearPublicCache();
  vi.useRealTimers();
});

describe("withPublicCache", () => {
  it("loads once per key until the ttl lapses", async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockResolvedValue("value");

    expect(await withPublicCache("k", load)).toBe("value");
    expect(await withPublicCache("k", load)).toBe("value");
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    expect(await withPublicCache("k", load)).toBe("value");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load across concurrent callers", async () => {
    const load = vi.fn().mockResolvedValue(["a"]);

    const [first, second] = await Promise.all([
      withPublicCache("burst", load),
      withPublicCache("burst", load),
    ]);

    expect(first).toEqual(["a"]);
    expect(second).toEqual(["a"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("caches null so a missing record does not re-query every request", async () => {
    const load = vi.fn().mockResolvedValue(null);

    expect(await withPublicCache("missing", load)).toBeNull();
    expect(await withPublicCache("missing", load)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("never caches a rejection", async () => {
    const load = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(withPublicCache("bad", load)).rejects.toThrow("boom");
    expect(readPublicCache("bad")).toBeUndefined();

    await expect(withPublicCache("bad", load)).rejects.toThrow("boom");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
