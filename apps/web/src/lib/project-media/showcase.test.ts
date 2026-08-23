// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initHlsMock = vi.fn();

vi.mock("./hls", () => ({
  initHls: (...args: unknown[]) => initHlsMock(...args),
}));

import { bindShowcaseVideo } from "./showcase";

class TestIntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    TestIntersectionObserver.instances.push(this);
  }

  trigger(target: Element, intersectionRatio: number) {
    this.callback(
      [
        {
          target,
          intersectionRatio,
          isIntersecting: intersectionRatio > 0,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }

  takeRecords() {
    return [];
  }
}

function mediaQuery(matches: () => boolean, media: string) {
  const query = new EventTarget() as MediaQueryList;
  Object.defineProperties(query, {
    matches: { get: matches },
    media: { value: media },
    onchange: { value: null, writable: true },
  });
  return query;
}

describe("bindShowcaseVideo", () => {
  let documentHidden = false;
  let reduceMotion = false;
  let reducedMotion: MediaQueryList;

  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <div data-showcase-video data-media-src="https://video.test/manifest.m3u8">
          <picture data-project-poster></picture>
          <video></video>
        </div>
      </main>
    `;
    TestIntersectionObserver.instances = [];
    initHlsMock.mockReset();
    documentHidden = false;
    reduceMotion = false;
    reducedMotion = mediaQuery(() => reduceMotion, "(prefers-reduced-motion: reduce)");
    const pointer = mediaQuery(() => false, "(pointer: fine)");

    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    vi.spyOn(document, "hidden", "get").mockImplementation(() => documentHidden);
    vi.spyOn(window, "matchMedia").mockImplementation((query) =>
      query === "(prefers-reduced-motion: reduce)" ? reducedMotion : pointer,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("autoplays only while visible and tears down its media lifecycle", async () => {
    const root = document.querySelector("main");
    const card = document.querySelector<HTMLElement>("[data-showcase-video]");
    const poster = document.querySelector<HTMLElement>("[data-project-poster]");
    const video = document.querySelector("video");
    if (!root || !card || !poster || !video) {
      throw new Error("Showcase fixture is incomplete");
    }

    let paused = true;
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused });
    const play = vi.fn(async () => {
      paused = false;
    });
    const pause = vi.fn(() => {
      paused = true;
      video.dispatchEvent(new Event("pause"));
    });
    video.play = play;
    video.pause = pause;

    const hls = {
      startLoad: vi.fn(),
      stopLoad: vi.fn(),
      destroy: vi.fn(),
    };
    let markReady = () => undefined;
    initHlsMock.mockImplementation(
      async (_video: HTMLVideoElement, _src: string, onReady: () => void) => {
        markReady = onReady;
        return hls;
      },
    );

    const cleanup = bindShowcaseVideo(root);
    const observer = TestIntersectionObserver.instances[0];
    observer?.trigger(card, 0.6);
    await Promise.resolve();

    expect(initHlsMock).toHaveBeenCalledOnce();
    expect(hls.startLoad).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledOnce();
    expect(card.classList.contains("is-playing")).toBe(true);

    markReady();
    expect(poster.classList.contains("is-off")).toBe(true);

    documentHidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(pause).toHaveBeenCalledOnce();
    expect(hls.stopLoad).toHaveBeenCalledOnce();
    expect(card.classList.contains("is-playing")).toBe(false);

    documentHidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(play).toHaveBeenCalledTimes(2);
    expect(hls.startLoad).toHaveBeenCalledTimes(2);

    reduceMotion = true;
    reducedMotion.dispatchEvent(new Event("change"));
    expect(pause).toHaveBeenCalledTimes(2);
    expect(hls.stopLoad).toHaveBeenCalledTimes(2);

    cleanup();
    expect(observer?.disconnect).toHaveBeenCalledOnce();
    expect(hls.destroy).toHaveBeenCalledOnce();

    reduceMotion = false;
    reducedMotion.dispatchEvent(new Event("change"));
    expect(play).toHaveBeenCalledTimes(2);
  });
});
