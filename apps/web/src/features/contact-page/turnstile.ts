const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      appearance: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  getResponse: (id: string) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

export type TurnstileHandle = {
  /** Resolves once the widget has produced a token, or `undefined` if it cannot. */
  getToken: () => Promise<string | undefined>;
  reset: () => void;
  destroy: () => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };
type TokenWaiter = {
  resolve: (value: string | undefined) => void;
  timer: number;
};

/**
 * Turnstile normally resolves well before this; the timeout only covers slow
 * connections and interactive challenges without leaving a submit pending.
 */
const TOKEN_TIMEOUT_MS = 10_000;
let apiPromise: Promise<TurnstileApi | null> | null = null;

function currentApi() {
  return (window as TurnstileWindow).turnstile ?? null;
}

function loadApi() {
  const available = currentApi();
  if (available) {
    return Promise.resolve(available);
  }
  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise<TurnstileApi | null>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    const script = existing ?? document.createElement("script");

    const finish = (api: TurnstileApi | null) => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      resolve(api);
    };
    const onLoad = () => finish(currentApi());
    const onError = () => {
      if (!existing) {
        script.remove();
      }
      finish(null);
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).then((api) => {
    if (!api) {
      apiPromise = null;
    }
    return api;
  });

  return apiPromise;
}

export async function loadTurnstile(slot: HTMLElement): Promise<TurnstileHandle | null> {
  const sitekey = slot.dataset.sitekey;
  if (!sitekey) {
    return null;
  }

  const api = await loadApi();
  if (!api) {
    return null;
  }

  let token: string | undefined;
  let destroyed = false;
  const waiting = new Set<TokenWaiter>();

  const deliver = (value: string | undefined) => {
    token = value;
    for (const waiter of waiting) {
      window.clearTimeout(waiter.timer);
      waiter.resolve(value);
    }
    waiting.clear();
  };

  let widgetId: string;
  try {
    widgetId = api.render(slot, {
      sitekey,
      appearance: "interaction-only",
      callback: (value) => {
        if (!destroyed) {
          deliver(value);
        }
      },
      "expired-callback": () => {
        token = undefined;
      },
      "error-callback": () => {
        if (!destroyed) {
          deliver(undefined);
        }
      },
    });
  } catch {
    return null;
  }

  return {
    getToken() {
      if (destroyed) {
        return Promise.resolve(undefined);
      }
      const settled = token || api.getResponse(widgetId);
      if (settled) {
        return Promise.resolve(settled);
      }

      return new Promise<string | undefined>((resolve) => {
        const waiter: TokenWaiter = {
          resolve,
          timer: window.setTimeout(() => {
            waiting.delete(waiter);
            resolve(destroyed ? undefined : api.getResponse(widgetId) || undefined);
          }, TOKEN_TIMEOUT_MS),
        };
        waiting.add(waiter);
      });
    },
    reset() {
      if (!destroyed) {
        token = undefined;
        api.reset(widgetId);
      }
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      deliver(undefined);
      api.remove(widgetId);
    },
  };
}
