// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadTurnstile } from "./turnstile";

type WidgetOptions = {
  sitekey: string;
  appearance: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

describe("loadTurnstile", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "turnstile");
    document.body.innerHTML = "";
  });

  it("returns no widget when the site key is absent", async () => {
    const slot = document.createElement("div");
    expect(await loadTurnstile(slot)).toBeNull();
  });

  it("waits for a token and removes the widget during teardown", async () => {
    const slot = document.createElement("div");
    slot.dataset.sitekey = "test-site-key";
    document.body.appendChild(slot);

    let options: WidgetOptions | undefined;
    let response = "";
    const api = {
      render: vi.fn((_slot: HTMLElement, value: WidgetOptions) => {
        options = value;
        return "widget-id";
      }),
      getResponse: vi.fn(() => response),
      reset: vi.fn(),
      remove: vi.fn(),
    };
    Object.assign(window, { turnstile: api });

    const handle = await loadTurnstile(slot);
    expect(handle).not.toBeNull();
    expect(api.render).toHaveBeenCalledOnce();
    expect(options?.sitekey).toBe("test-site-key");
    expect(options?.appearance).toBe("interaction-only");

    const pendingToken = handle?.getToken();
    options?.callback("verified-token");
    await expect(pendingToken).resolves.toBe("verified-token");

    handle?.reset();
    expect(api.reset).toHaveBeenCalledWith("widget-id");

    response = "response-token";
    await expect(handle?.getToken()).resolves.toBe("response-token");

    response = "";
    const pendingAtDestroy = handle?.getToken();
    handle?.destroy();
    await expect(pendingAtDestroy).resolves.toBeUndefined();
    expect(api.remove).toHaveBeenCalledWith("widget-id");
    await expect(handle?.getToken()).resolves.toBeUndefined();

    handle?.destroy();
    expect(api.remove).toHaveBeenCalledOnce();
  });
});
