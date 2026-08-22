import { playScramble } from "./text-scramble";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initSectionDividers() {
  document.querySelectorAll<HTMLElement>("[data-section-divider]").forEach((el) => {
    if (el.dataset.bound === "true") {
      return;
    }
    el.dataset.bound = "true";

    const duration = Number(el.dataset.duration || 2);

    if (prefersReducedMotion()) {
      el.classList.add("is-in-view", "is-done");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }
        observer.disconnect();
        el.classList.add("is-in-view");
        el.querySelectorAll<HTMLElement>("[data-scramble]").forEach((target) => {
          playScramble(target, { duration });
        });
        window.setTimeout(() => el.classList.add("is-done"), duration * 1000);
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
  });
}
