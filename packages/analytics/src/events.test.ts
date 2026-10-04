// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setConsent } from "./consent";
import {
  clearAnalyticsQueue,
  setAnalyticsCapture,
  trackNavigationClicked,
  trackProjectCardViewed,
} from "./events";

beforeEach(() => {
  window.localStorage.clear();
  setAnalyticsCapture(null);
  clearAnalyticsQueue();
});

afterEach(() => {
  setAnalyticsCapture(null);
});

describe("event dispatcher", () => {
  it("drops events while consent is pending", () => {
    expect(trackProjectCardViewed({ project_slug: "a" })).toBe(false);

    const capture = vi.fn();
    setAnalyticsCapture(capture);
    expect(capture).not.toHaveBeenCalled();
  });

  it("queues events after consent and replays them with their original time", () => {
    setConsent("accepted");
    expect(trackProjectCardViewed({ project_slug: "a" })).toBe(true);

    const capture = vi.fn();
    setAnalyticsCapture(capture);
    expect(capture).toHaveBeenCalledWith(
      "project_card_viewed",
      { project_slug: "a" },
      { timestamp: expect.any(Date) },
    );
  });

  it("clears queued events when they are discarded", () => {
    setConsent("accepted");
    trackProjectCardViewed({ project_slug: "a" });
    clearAnalyticsQueue();

    const capture = vi.fn();
    setAnalyticsCapture(capture);
    expect(capture).not.toHaveBeenCalled();
  });

  it("caps the queue", () => {
    setConsent("accepted");
    const accepted = Array.from({ length: 60 }, (_, index) =>
      trackProjectCardViewed({ project_slug: String(index) }),
    );
    expect(accepted.filter(Boolean)).toHaveLength(50);
  });

  it("scrubs link destinations before they reach the SDK", () => {
    const capture = vi.fn();
    setAnalyticsCapture(capture);
    trackNavigationClicked({
      label: "Reset",
      destination: "https://www.geraldbahati.dev/reset?token=secret",
      surface: "footer",
    });
    expect(capture).toHaveBeenCalledWith(
      "navigation_clicked",
      expect.objectContaining({ destination: "https://www.geraldbahati.dev/reset" }),
      undefined,
    );
  });
});
