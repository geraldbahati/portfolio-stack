import { bindHoverScramble, playScramble } from "../../lib/motion/text-scramble";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function enhanceHero() {
  if (prefersReducedMotion()) {
    return;
  }

  const name = document.querySelector<HTMLElement>("[data-hero-name]");
  if (name) {
    name.classList.add("is-scrambling");
    playScramble(name, { duration: 0.5, speed: 0.05 });
    window.setTimeout(() => name.classList.remove("is-scrambling"), 800);
  }

  const cta = document.querySelector<HTMLAnchorElement>("[data-hero-cta]");
  if (cta) {
    bindHoverScramble(cta, { duration: 0.5, speed: 0.04, holdMs: 500 });
  }

  if (window.matchMedia("(pointer: fine)").matches) {
    const slot = document.querySelector<HTMLElement>("[data-hero-bio] [data-grid-pattern-slot]");
    if (slot) {
      void import("../../lib/motion/grid-pattern").then(({ mountGridPattern }) =>
        mountGridPattern(slot),
      );
    }
  }
}

enhanceHero();
