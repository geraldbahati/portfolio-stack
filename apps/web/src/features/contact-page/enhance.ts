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
import { loadTurnstile, type TurnstileHandle } from "./turnstile";

function bindMarquee(root: HTMLElement) {
  const marquee = root.querySelector<HTMLElement>("[data-hello-marquee]");
  if (!marquee) {
    return () => undefined;
  }

  const events = new AbortController();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  const sync = () => {
    marquee.classList.toggle("is-running", visible && !document.hidden && !reducedMotion.matches);
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    },
    { threshold: 0 },
  );
  observer.observe(marquee);
  document.addEventListener("visibilitychange", sync, { signal: events.signal });
  reducedMotion.addEventListener("change", sync, { signal: events.signal });

  return () => {
    events.abort();
    observer.disconnect();
    marquee.classList.remove("is-running");
  };
}

function bindGrid(root: HTMLElement) {
  const slot = root.querySelector<HTMLElement>("[data-grid-pattern-slot]");
  if (!slot) {
    return () => undefined;
  }

  const events = new AbortController();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  let cleanup: (() => void) | undefined;
  let loading: Promise<void> | null = null;
  let destroyed = false;

  const mount = () => {
    if (destroyed || cleanup || loading || reducedMotion.matches || !finePointer.matches) {
      return;
    }
    loading = import("../../lib/motion/grid-pattern")
      .then(({ mountGridPattern }) => {
        if (!destroyed && !reducedMotion.matches && finePointer.matches) {
          cleanup = mountGridPattern(slot);
        }
      })
      .finally(() => {
        loading = null;
      });
  };

  const sync = () => {
    if (reducedMotion.matches || !finePointer.matches) {
      cleanup?.();
      cleanup = undefined;
      return;
    }
    mount();
  };

  reducedMotion.addEventListener("change", sync, { signal: events.signal });
  finePointer.addEventListener("change", sync, { signal: events.signal });
  mount();

  return () => {
    destroyed = true;
    events.abort();
    cleanup?.();
    cleanup = undefined;
  };
}

function bindChannels(root: HTMLElement) {
  const events = new AbortController();
  const cleanups: Array<() => void> = [];
  for (const link of root.querySelectorAll<HTMLAnchorElement>("[data-contact-channel]")) {
    cleanups.push(bindHoverScramble(link, { duration: 0.8, speed: 0.04, holdMs: 500 }));
    link.addEventListener(
      "click",
      () => {
        trackContactChannelClicked({
          channel: (link.dataset.contactChannel as ContactChannel) ?? "phone",
          surface: "contact_page",
        });
      },
      { signal: events.signal },
    );
  }

  return () => {
    events.abort();
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

function bindForm(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-contact-form]");
  const submit = root.querySelector<HTMLButtonElement>("[data-contact-submit]");
  const status = root.querySelector<HTMLElement>("[data-contact-status]");
  const privacy = root.querySelector<HTMLInputElement>("#contact-privacy");
  const turnstileSlot = root.querySelector<HTMLElement>("[data-turnstile]");

  if (!form || !submit) {
    return () => undefined;
  }

  const events = new AbortController();
  let destroyed = false;
  let submitting = false;
  let started = false;
  let startedAt = 0;
  let turnstile: TurnstileHandle | null = null;
  let turnstilePromise: Promise<void> | null = null;

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

  privacy?.addEventListener(
    "change",
    () => {
      submit.disabled = !privacy.checked;
      setFieldError("privacyConsent");
    },
    { signal: events.signal },
  );

  form.addEventListener(
    "input",
    (event) => {
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
    },
    { signal: events.signal },
  );

  form.addEventListener(
    "focusin",
    () => {
      if (!turnstilePromise && turnstileSlot) {
        turnstilePromise = loadTurnstile(turnstileSlot).then((result) => {
          if (destroyed) {
            result?.destroy();
          } else {
            turnstile = result;
          }
        });
      }
    },
    { signal: events.signal },
  );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      if (submitting || destroyed) {
        return;
      }
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

      submitting = true;
      setBusy(true);
      try {
        if (turnstilePromise) {
          await turnstilePromise;
        }
        if (destroyed) {
          return;
        }

        const elapsedMs = startedAt ? Date.now() - startedAt : undefined;
        const turnstileToken = turnstile ? await turnstile.getToken() : undefined;
        if (destroyed) {
          return;
        }

        // Submitting without a token when the widget is present is a guaranteed
        // rejection, and "Invalid submission detected" reads like the visitor did
        // something wrong. Ask them to retry instead.
        if (turnstile && !turnstileToken) {
          setStatus("error", FORM_VERIFICATION_PENDING);
          return;
        }

        try {
          const result = await orpc.contact.submit({
            ...parsed.data,
            turnstileToken,
          });
          if (destroyed) {
            return;
          }

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
          if (destroyed) {
            return;
          }
          setStatus("error", FAIL_FALLBACK);
          trackContactFormSubmitted({
            outcome: "error",
            error_reason: "network_or_mutation_failure",
            message_length: parsed.data.message.length,
            duration_ms: elapsedMs,
          });
        }
      } finally {
        submitting = false;
        if (!destroyed) {
          setBusy(false);
        }
      }
    },
    { signal: events.signal },
  );

  return () => {
    destroyed = true;
    events.abort();
    turnstile?.destroy();
    turnstile = null;
  };
}

export function enhanceContactPage(root: HTMLElement) {
  const cleanups = [bindMarquee(root), bindGrid(root), bindChannels(root), bindForm(root)];

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
