import { afterEach, describe, expect, it, vi } from "vitest";

const hlsMocks = vi.hoisted(() => ({
  attachMedia: vi.fn(),
  construct: vi.fn(),
  loadSource: vi.fn(),
  on: vi.fn(),
  importModule: vi.fn(),
}));

vi.mock("hls.js", () => {
  hlsMocks.importModule();
  class HlsMock {
    static Events = {
      ERROR: "error",
      MANIFEST_PARSED: "manifestParsed",
      MEDIA_ATTACHED: "mediaAttached",
    };

    static isSupported() {
      return true;
    }

    constructor(config: unknown) {
      hlsMocks.construct(config);
    }

    attachMedia = hlsMocks.attachMedia;
    loadSource = hlsMocks.loadSource;
    on = hlsMocks.on;
  }

  return { default: HlsMock };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("project HLS initialization", () => {
  it("uses native HLS without importing the JavaScript player", async () => {
    vi.resetModules();
    const { initHls } = await import("./hls");
    const onReady = vi.fn();
    const video = {
      canPlayType: vi.fn(() => "probably"),
      addEventListener: vi.fn(),
      src: "",
    } as unknown as HTMLVideoElement;

    expect(await initHls(video, "https://example.com/video.m3u8", onReady, vi.fn())).toBeNull();
    expect(video.src).toBe("https://example.com/video.m3u8");
    expect(video.addEventListener).toHaveBeenCalledWith("canplay", onReady, { once: true });
    expect(hlsMocks.importModule).not.toHaveBeenCalled();
    expect(hlsMocks.construct).not.toHaveBeenCalled();
  });

  it("starts loading after the media element is attached", async () => {
    const { initHls } = await import("./hls");
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    const video = {
      canPlayType: vi.fn(() => ""),
    } as unknown as HTMLVideoElement;

    await initHls(video, "https://example.com/video.m3u8", vi.fn(), vi.fn());

    expect(hlsMocks.construct).toHaveBeenCalledWith(
      expect.objectContaining({
        autoStartLoad: true,
        enableWorker: true,
      }),
    );
    expect(hlsMocks.loadSource).not.toHaveBeenCalled();
    expect(hlsMocks.attachMedia).toHaveBeenCalledWith(video);

    const mediaAttachedHandler = hlsMocks.on.mock.calls.find(
      ([event]) => event === "mediaAttached",
    )?.[1];
    mediaAttachedHandler?.();

    expect(hlsMocks.loadSource).toHaveBeenCalledWith("https://example.com/video.m3u8");
  });

  it("can force the JavaScript player after native playback fails", async () => {
    const { initHls } = await import("./hls");
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    const video = {
      canPlayType: vi.fn(() => "probably"),
    } as unknown as HTMLVideoElement;

    await initHls(video, "https://example.com/video.m3u8", vi.fn(), vi.fn(), {
      forceHlsJs: true,
    });

    expect(hlsMocks.construct).toHaveBeenCalledOnce();
    expect(hlsMocks.attachMedia).toHaveBeenCalledWith(video);
  });
});
