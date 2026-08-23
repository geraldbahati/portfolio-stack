import { afterEach, describe, expect, it, vi } from "vitest";

import { initHls } from "./hls";

const hlsMocks = {
  attachMedia: vi.fn(),
  construct: vi.fn(),
  loadSource: vi.fn(),
  on: vi.fn(),
};

vi.mock("hls.js", () => {
  class HlsMock {
    static Events = {
      ERROR: "error",
      MANIFEST_PARSED: "manifestParsed",
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
  it("leaves fragment loading under the visibility controller", async () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    const video = {
      canPlayType: vi.fn(() => ""),
    } as unknown as HTMLVideoElement;

    await initHls(video, "https://example.com/video.m3u8", vi.fn(), vi.fn());

    expect(hlsMocks.construct).toHaveBeenCalledWith(
      expect.objectContaining({
        autoStartLoad: false,
        enableWorker: true,
      }),
    );
    expect(hlsMocks.loadSource).toHaveBeenCalledWith("https://example.com/video.m3u8");
    expect(hlsMocks.attachMedia).toHaveBeenCalledWith(video);
  });
});
