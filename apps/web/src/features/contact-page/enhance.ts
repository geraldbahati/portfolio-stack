import type { ContactChannel } from "@portfolio-stack/analytics/events";
import {
  trackContactChannelClicked,
  trackContactFormStarted,
  trackContactFormSubmitted,
} from "@portfolio-stack/analytics/events";

import { orpc } from "../../lib/data/orpc";
import { bindHoverScramble } from "../../lib/motion/text-scramble";
import { FORM_SUBMIT, FORM_SUBMITTING, FORM_VERIFICATION_PENDING } from "./copy";
import { FAIL_FALLBACK, readContactForm, validateContactForm } from "./form-state";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bindMarquee(root: HTMLElement) {
  const marquee = root.querySelector<HTMLElement>("[data-hello-marquee]");
  if (!marquee || prefersReducedMotion()) {
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      marquee.classList.toggle("is-running", Boolean(entry?.isIntersecting));
    },
    { threshold: 0 },
  );
  observer.observe(marquee);
}

function bindGrid(root: HTMLElement) {
  if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) {
    return;
  }
  const slot = root.querySelector<HTMLElement>("[data-grid-pattern-slot]");
  if (slot) {
    void import("../../lib/motion/grid-pattern").then(({ mountGridPattern }) =>
      mountGridPattern(slot),
    );
  }
}

function bindChannels(root: HTMLElement) {
  for (const link of root.querySelectorAll<HTMLAnchorElement>("[data-contact-channel]")) {
    bindHoverScramble(link, { duration: 0.8, speed: 0.04, holdMs: 500 });
    link.addEventListener("click", () => {
      trackContactChannelClicked({
        channel: (link.dataset.contactChannel as ContactChannel) ?? "phone",
        surface: "contact_page",
      });
    });
  }
}

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
};

type TurnstileHandle = {
  /** Resolves once the widget has produced a token, or `undefined` if it cannot. */
  getToken: () => Promise<string | undefined>;
  reset: () => void;
};

/**
 * How long to wait for a token before giving up. Turnstile normally solves in
 * well under a second; this only matters on a slow connection or when the
 * visitor is shown an interactive challenge.
 */
const TURNSTILE_TOKEN_TIMEOUT_MS = 10_000;

function loadTurnstile(slot: HTMLElement) {
  const sitekey = slot.dataset.sitekey;
  if (!sitekey) {
    return Promise.resolve(null);
  }

  return new Promise<TurnstileHandle | null>((resolve) => {
    const ready = () => {
      const api = (window as Window & { turnstile?: TurnstileApi }).turnstile;
      if (!api) {
        resolve(null);
        return;
      }

      // `render` returns as soon as the widget exists; the token arrives later
      // through this callback. Waiting on `render` alone meant a visitor who
      // submitted before the challenge resolved sent no token and was rejected
      // as invalid.
      let token: string | undefined;
      let waiting: ((value: string | undefined) => void)[] = [];

      const deliver = (value: string | undefined) => {
        token = value;
        const pending = waiting;
        waiting = [];
        for (const resolveWaiter of pending) resolveWaiter(value);
      };

      const widgetId = api.render(slot, {
        sitekey,
        appearance: "interaction-only",
        callback: (value) => deliver(value),
        // An expired token is no longer accepted, so drop it and let the next
        // request wait for a fresh one.
        "expired-callback": () => {
          token = undefined;
        },
        "error-callback": () => deliver(undefined),
      });

      const getToken = () => {
        const settled = token || api.getResponse(widgetId);
        if (settled) return Promise.resolve(settled);

        return new Promise<string | undefined>((resolveToken) => {
          const timer = setTimeout(() => {
            waiting = waiting.filter((entry) => entry !== onSettled);
            resolveToken(api.getResponse(widgetId) || undefined);
          }, TURNSTILE_TOKEN_TIMEOUT_MS);

          const onSettled = (value: string | undefined) => {
            clearTimeout(timer);
            resolveToken(value);
          };

          waiting.push(onSettled);
        });
      };

      resolve({
        getToken,
        reset: () => {
          token = undefined;
          api.reset(widgetId);
        },
      });
    };

    if ((window as Window & { turnstile?: TurnstileApi }).turnstile) {
      ready();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    document.head.appendChild(script);
  });
}

function bindForm(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-contact-form]");
  const submit = root.querySelector<HTMLButtonElement>("[data-contact-submit]");
  const status = root.querySelector<HTMLElement>("[data-contact-status]");
  const privacy = root.querySelector<HTMLInputElement>("#contact-privacy");
  const turnstileSlot = root.querySelector<HTMLElement>("[data-turnstile]");

  if (!form || !submit) {
    return;
  }

  let started = false;
  let startedAt = 0;
  let turnstile: TurnstileHandle | null = null;
  let turnstilePromise: Promise<unknown> | null = null;

  const setBusy = (busy: boolean) => {
    submit.disabled = busy || !privacy?.checked;
    submit.setAttribute("aria-busy", String(busy));
    submit.textContent = busy ? FORM_SUBMITTING : FORM_SUBMIT;
  };

  const setStatus = (type: "success" | "error" | null, message = "") => {
    if (!status) {
      return;
    }
    if (!type) {
      status.hidden = true;
      status.textContent = "";
      return;
    }
    status.hidden = false;
    status.dataset.type = type;
    status.textContent = message;
  };

  const setFieldError = (name: string, message?: string) => {
    const field = form.querySelector<HTMLElement>(`[name="${name}"]`);
    const error = form.querySelector<HTMLElement>(`#contact-${name}-error`);
    field?.setAttribute("aria-invalid", message ? "true" : "false");
    field?.toggleAttribute("aria-describedby", Boolean(message));
    if (message) {
      field?.setAttribute("aria-describedby", `contact-${name}-error`);
    }
    if (error) {
      error.hidden = !message;
      error.textContent = message ?? "";
    }
  };

  const clearErrors = () => {
    for (const name of ["name", "email", "message", "privacyConsent"]) {
      setFieldError(name);
    }
  };

  privacy?.addEventListener("change", () => {
    submit.disabled = !privacy.checked;
    setFieldError("privacyConsent");
  });

  form.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!started && target.value && target.name !== "honeypot") {
      started = true;
      startedAt = Date.now();
      trackContactFormStarted({ first_field: target.name });
    }
    if (target.name) {
      setFieldError(target.name);
    }
    setStatus(null);
  });

  form.addEventListener("focusin", () => {
    if (!turnstilePromise && turnstileSlot) {
      turnstilePromise = loadTurnstile(turnstileSlot).then((result) => {
        turnstile = result;
      });
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    setStatus(null);

    const parsed = validateContactForm(readContactForm(form));
    if (!parsed.ok) {
      for (const [name, message] of Object.entries(parsed.errors)) {
        if (message) {
          setFieldError(name, message);
        }
      }
      return;
    }

    setBusy(true);
    if (turnstilePromise) {
      await turnstilePromise;
    }

    const elapsedMs = startedAt ? Date.now() - startedAt : undefined;
    const turnstileToken = turnstile ? await turnstile.getToken() : undefined;

    // Submitting without a token when the widget is present is a guaranteed
    // rejection, and "Invalid submission detected" reads like the visitor did
    // something wrong. Ask them to retry instead.
    if (turnstile && !turnstileToken) {
      setBusy(false);
      setStatus("error", FORM_VERIFICATION_PENDING);
      return;
    }

    try {
      const result = await orpc.contact.submit({
        ...parsed.data,
        turnstileToken,
      });

      if (result.ok) {
        setStatus("success", result.message);
        form.reset();
        turnstile?.reset();
        trackContactFormSubmitted({
          outcome: "success",
          message_length: parsed.data.message.length,
          duration_ms: elapsedMs,
        });
      } else {
        setStatus("error", result.error || FAIL_FALLBACK);
        trackContactFormSubmitted({
          outcome: "error",
          error_reason: result.error ?? "rejected_by_backend",
          message_length: parsed.data.message.length,
          duration_ms: elapsedMs,
        });
      }
    } catch {
      setStatus("error", FAIL_FALLBACK);
      trackContactFormSubmitted({
        outcome: "error",
        error_reason: "network_or_mutation_failure",
        message_length: parsed.data.message.length,
        duration_ms: elapsedMs,
      });
    } finally {
      setBusy(false);
    }
  });
}

export function enhanceContactPage(root: HTMLElement) {
  bindMarquee(root);
  bindGrid(root);
  bindChannels(root);
  bindForm(root);
}
