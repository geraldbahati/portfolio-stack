// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";

import { getConsent, setConsent, subscribeToConsent } from "./consent";

describe("consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts pending", () => {
    expect(getConsent()).toBe("pending");
  });

  it("persists accept and reject", () => {
    setConsent("accepted");
    expect(getConsent()).toBe("accepted");
    setConsent("rejected");
    expect(getConsent()).toBe("rejected");
    expect(window.localStorage.getItem("analytics-opt-out")).toBe("true");
  });

  it("notifies subscribers", () => {
    const seen: string[] = [];
    const unsubscribe = subscribeToConsent((decision) => {
      seen.push(decision);
    });
    setConsent("accepted");
    unsubscribe();
    setConsent("rejected");
    expect(seen).toEqual(["accepted"]);
  });
});
