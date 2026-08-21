import { describe, expect, it } from "vitest";

import {
  CONTACT_ARIA,
  CONTACT_CTA_LABEL,
  CONTACT_HEADING_LEFT,
  CONTACT_HEADING_RIGHT,
  CONTACT_VIDEO_SRC,
  LEFT_SCRAMBLE_SPEED,
  RIGHT_SCRAMBLE_SPEED,
} from "./copy";
import { applyContactPlayback, shouldRevealMedia } from "./state";

describe("contact CTA copy", () => {
  it("keeps the live-site heading and analytics label", () => {
    expect(CONTACT_HEADING_LEFT).toBe("Let's discuss");
    expect(CONTACT_HEADING_RIGHT).toBe("your project");
    expect(CONTACT_CTA_LABEL).toBe("Let's work together");
    expect(CONTACT_ARIA).toBe("Navigate to contact page to discuss your project");
    expect(CONTACT_VIDEO_SRC).toBe("/cta-video.mp4");
    expect(LEFT_SCRAMBLE_SPEED).toBe(0.1);
    expect(RIGHT_SCRAMBLE_SPEED).toBe(0.04);
  });
});

describe("contact media reveal", () => {
  it("only expands the inline video on hover/focus without reduced motion", () => {
    expect(shouldRevealMedia(true, false)).toBe(true);
    expect(shouldRevealMedia(true, true)).toBe(false);
    expect(shouldRevealMedia(false, false)).toBe(false);
  });

  it("rewinds when the media collapses", () => {
    const video = {
      paused: false,
      currentTime: 4,
      pause() {
        this.paused = true;
      },
      play: () => Promise.resolve(),
    } as HTMLVideoElement;

    applyContactPlayback(video, false);
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(0);
  });
});
