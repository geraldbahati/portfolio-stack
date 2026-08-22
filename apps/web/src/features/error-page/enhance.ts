import { bindHoverScramble, playScramble } from "../../lib/motion/text-scramble";

const prefersReducedMotion = () =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function enhanceErrorPage(root: HTMLElement) {
  // Everything here decorates markup that already reads correctly, so anyone
  // without JavaScript loses nothing but the flourish.
  const slot = root.querySelector<HTMLElement>("[data-grid-pattern-slot]");
  if (slot) {
    void import("../../lib/motion/grid-pattern").then(({ mountGridPattern }) =>
      mountGridPattern(slot),
    );
  }

  // The grid itself is static; only the text effects are motion.
  if (prefersReducedMotion()) {
    return;
  }

  const message = root.querySelector<HTMLElement>("[data-error-message]");
  if (message) {
    playScramble(message, { duration: 1, speed: 0.03 });
  }

  const home = root.querySelector<HTMLElement>("[data-error-home] .error-page__home-label");
  if (home) {
    bindHoverScramble(home, { duration: 0.6, speed: 0.04, holdMs: 400 });
  }
}
