// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initHlsMock = vi.fn();
const preloadHlsMock = vi.fn(() => Promise.resolve({}));

vi.mock("./hls", () => ({
  initHls: (...args: unknown[]) => initHlsMock(...args),
  preloadHls: () => preloadHlsMock(),
}));

import { bindProjectMedia } from "./media";

class TestIntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    TestIntersectionObserver.instances.push(this);
  }

  trigger(target: Element, intersectionRatio: number, isIntersecting = intersectionRatio > 0) {
    this.callback(
      [
        {
          target,
          intersectionRatio,
          isIntersecting,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }

  takeRecords() {
    return [];
  }
}

function mediaQuery(matches: boolean, media: string) {
  const query = new EventTarget() as MediaQueryList;
  Object.defineProperties(query, {
    matches: { value: matches },
    media: { value: media },
    onchange: { value: null, writable: true },
  });
  return query;
}

describe("bindProjectMedia", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main data-playback="on">
        <article
          data-project-card
          data-media-type="video"
          data-media-src="https://video.test/manifest.m3u8"
        >
          <picture data-project-poster></picture>
          <video muted></video>
        </article>
      </main>
    `;
    TestIntersectionObserver.instances = [];
    initHlsMock.mockReset();
    preloadHlsMock.mockClear();
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => mediaQuery(false, query));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("prebuffers near cards but keeps the poster until playback really starts", async () => {
    const root = document.querySelector<HTMLElement>("main");
    const card = document.querySelector<HTMLElement>("[data-project-card]");
    const poster = document.querySelector<HTMLElement>("[data-project-poster]");
    const video = document.querySelector("video");
    if (!root || !card || !poster || !video) {
      throw new Error("Project card fixture is incomplete");
    }

    let paused = true;
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused });
    Object.defineProperty(video, "ended", { configurable: true, get: () => false });
    Object.defineProperty(video, "canPlayType", {
      configurable: true,
      value: () => "",
    });

    let resolvePlay = () => undefined;
    video.play = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePlay = () => {
            paused = false;
            resolve();
          };
        }),
    );
    video.pause = vi.fn(() => {
      paused = true;
      video.dispatchEvent(new Event("pause"));
    });

    const hls = {
      startLoad: vi.fn(),
      stopLoad: vi.fn(),
      destroy: vi.fn(),
    };
    initHlsMock.mockResolvedValue(hls);

    const media = bindProjectMedia(root);
    const proximity = TestIntersectionObserver.instances[0];
    const visibility = TestIntersectionObserver.instances[1];

    expect(proximity?.options?.rootMargin).toBe("50% 25%");
    expect(preloadHlsMock).toHaveBeenCalledOnce();

    proximity?.trigger(card, 0.01, true);
    await Promise.resolve();
    await Promise.resolve();

    expect(initHlsMock).toHaveBeenCalledOnce();
    expect(hls.startLoad).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
    expect(poster.classList.contains("is-off")).toBe(false);
    expect(card.classList.contains("is-playing")).toBe(false);

    visibility?.trigger(card, 0.5, true);
    expect(video.play).toHaveBeenCalledOnce();
    expect(video.preload).toBe("auto");
    expect(poster.classList.contains("is-off")).toBe(false);
    expect(card.classList.contains("is-playing")).toBe(false);

    resolvePlay();
    await Promise.resolve();

    expect(poster.classList.contains("is-off")).toBe(true);
    expect(card.classList.contains("is-playing")).toBe(true);

    visibility?.trigger(card, 0.05, true);
    expect(video.pause).toHaveBeenCalledOnce();
    expect(card.classList.contains("is-playing")).toBe(false);

    media.destroy();
    expect(proximity?.disconnect).toHaveBeenCalledOnce();
    expect(visibility?.disconnect).toHaveBeenCalledOnce();
    expect(hls.destroy).toHaveBeenCalledOnce();
  });

  it("releases native HLS after a card leaves the preload zone", async () => {
    const root = document.querySelector<HTMLElement>("main");
    const card = document.querySelector<HTMLElement>("[data-project-card]");
    const video = document.querySelector("video");
    if (!root || !card || !video) {
      throw new Error("Project card fixture is incomplete");
    }

    let paused = true;
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused });
    Object.defineProperty(video, "ended", { configurable: true, get: () => false });
    Object.defineProperty(video, "canPlayType", {
      configurable: true,
      value: () => "probably",
    });
    video.play = vi.fn(async () => {
      paused = false;
    });
    video.pause = vi.fn(() => {
      paused = true;
      video.dispatchEvent(new Event("pause"));
    });
    video.load = vi.fn();
    initHlsMock.mockImplementation(async (element: HTMLVideoElement, src: string) => {
      element.src = src;
      return null;
    });

    bindProjectMedia(root);
    const proximity = TestIntersectionObserver.instances[0];
    const visibility = TestIntersectionObserver.instances[1];

    proximity?.trigger(card, 0.01, true);
    visibility?.trigger(card, 0.5, true);
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }

    expect(video.getAttribute("src")).toBe("https://video.test/manifest.m3u8");
    expect(video.play).toHaveBeenCalledOnce();

    proximity?.trigger(card, 0, false);
    expect(video.getAttribute("src")).not.toBeNull();

    visibility?.trigger(card, 0, false);
    expect(video.getAttribute("src")).toBeNull();
    expect(video.preload).toBe("none");
    expect(video.load).toHaveBeenCalledOnce();

    proximity?.trigger(card, 0.01, true);
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
    expect(initHlsMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to hls.js when advertised native HLS rejects playback", async () => {
    const root = document.querySelector<HTMLElement>("main");
    const card = document.querySelector<HTMLElement>("[data-project-card]");
    const video = document.querySelector("video");
    if (!root || !card || !video) {
      throw new Error("Project card fixture is incomplete");
    }

    let paused = true;
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused });
    Object.defineProperty(video, "ended", { configurable: true, get: () => false });
    Object.defineProperty(video, "canPlayType", {
      configurable: true,
      value: () => "probably",
    });
    video.play = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("Native HLS failed", "NotSupportedError"))
      .mockImplementationOnce(async () => {
        paused = false;
      });
    video.pause = vi.fn(() => {
      paused = true;
      video.dispatchEvent(new Event("pause"));
    });
    video.load = vi.fn();

    const hls = {
      startLoad: vi.fn(),
      stopLoad: vi.fn(),
      destroy: vi.fn(),
    };
    initHlsMock
      .mockImplementationOnce(async (element: HTMLVideoElement, src: string) => {
        element.src = src;
        return null;
      })
      .mockResolvedValueOnce(hls);

    bindProjectMedia(root);
    const proximity = TestIntersectionObserver.instances[0];
    const visibility = TestIntersectionObserver.instances[1];
    proximity?.trigger(card, 0.01, true);
    visibility?.trigger(card, 0.5, true);

    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }

    expect(initHlsMock).toHaveBeenCalledTimes(2);
    expect(initHlsMock.mock.calls[1]?.[4]).toEqual({ forceHlsJs: true });
    expect(video.load).toHaveBeenCalledOnce();
    expect(hls.startLoad).toHaveBeenCalledOnce();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(card.classList.contains("is-playing")).toBe(true);
  });
});
