import { describe, expect, it } from "vitest";

import { byVisibility, nextVisible, shouldAutoplay, shouldShowPoster } from "./media-state";

describe("project media gates", () => {
  it("plays every in-view card, including while the gallery is scrubbing", () => {
    expect(
      shouldAutoplay({
        visible: true,
        pageVisible: true,
        playbackEnabled: true,
        reducedMotion: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoplay({
        visible: false,
        pageVisible: true,
        playbackEnabled: true,
        reducedMotion: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoplay({
        visible: true,
        pageVisible: true,
        playbackEnabled: false,
        reducedMotion: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoplay({
        visible: true,
        pageVisible: false,
        playbackEnabled: true,
        reducedMotion: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoplay({
        visible: true,
        pageVisible: true,
        playbackEnabled: true,
        reducedMotion: true,
      }),
    ).toBe(false);
  });

  it("uses hysteresis so a sliver does not start or kill a decoder", () => {
    expect(nextVisible(false, 0.19)).toBe(false);
    expect(nextVisible(false, 0.2)).toBe(true);
    expect(nextVisible(true, 0.15)).toBe(true);
    expect(nextVisible(true, 0.09)).toBe(false);
  });

  it("keeps the poster until HLS has a frame, then freezes off-screen", () => {
    expect(
      shouldShowPoster({
        activated: false,
        loaded: false,
        freezeFrameOnPause: true,
        playbackEnabled: true,
        playing: false,
      }),
    ).toBe(true);

    expect(
      shouldShowPoster({
        activated: true,
        loaded: true,
        freezeFrameOnPause: true,
        playbackEnabled: true,
        playing: false,
      }),
    ).toBe(false);

    expect(
      shouldShowPoster({
        activated: true,
        loaded: true,
        freezeFrameOnPause: true,
        playbackEnabled: false,
        playing: false,
      }),
    ).toBe(true);
  });

  it("activates the most visible card first", () => {
    expect(
      [
        { id: "a", ratio: 0.3 },
        { id: "b", ratio: 0.8 },
      ].sort(byVisibility)[0]?.id,
    ).toBe("b");
  });
});
