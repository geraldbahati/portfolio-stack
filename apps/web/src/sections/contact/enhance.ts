import { trackContactCtaClicked } from "@portfolio-stack/analytics/events";

import { playScramble } from "../../lib/text-scramble";
import { CONTACT_CTA_LABEL, CONTACT_HREF, CONTACT_VIDEO_SRC, SCRAMBLE_DURATION_S } from "./copy";
import { applyContactPlayback, createContactVideo, shouldRevealMedia } from "./state";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function enhanceContact(root: HTMLElement) {
  root.dataset.contactHydrated = "true";

  const target = root.querySelector<HTMLElement>("[data-contact-hover-target]");
  const link = root.querySelector<HTMLAnchorElement>("[data-contact-cta]");
  const media = root.querySelector<HTMLElement>("[data-contact-media]");
  const phrases = [...root.querySelectorAll<HTMLElement>("[data-scramble]")];

  if (!target || !link || !media) {
    return;
  }

  let hovered = false;
  let focused = false;
  let video: HTMLVideoElement | null = null;
  const stops: Array<() => void> = [];

  const stopScramble = () => {
    while (stops.length > 0) {
      stops.pop()?.();
    }
  };

  const sync = () => {
    const active = hovered || focused;
    const reveal = shouldRevealMedia(active, prefersReducedMotion());
    target.classList.toggle("is-active", active);
    target.classList.toggle("is-on", reveal);
    if (video) {
      applyContactPlayback(video, reveal);
    }
  };

  const startInteraction = () => {
    if (!prefersReducedMotion()) {
      if (!video) {
        video = createContactVideo(CONTACT_VIDEO_SRC);
        media.appendChild(video);
      }
      stopScramble();
      for (const phrase of phrases) {
        const speed = Number(phrase.dataset.scrambleSpeed ?? "0.04");
        stops.push(playScramble(phrase, { duration: SCRAMBLE_DURATION_S, speed }));
      }
    }
    sync();
  };

  target.addEventListener("mouseenter", () => {
    hovered = true;
    startInteraction();
  });
  target.addEventListener("mouseleave", () => {
    hovered = false;
    if (!focused) {
      stopScramble();
    }
    sync();
  });
  link.addEventListener("focus", () => {
    focused = true;
    startInteraction();
  });
  link.addEventListener("blur", () => {
    focused = false;
    if (!hovered) {
      stopScramble();
    }
    sync();
  });
  link.addEventListener("click", () => {
    trackContactCtaClicked({
      surface: "contact_section",
      label: CONTACT_CTA_LABEL,
      destination: CONTACT_HREF,
    });
  });

  if (!prefersReducedMotion() && window.matchMedia("(pointer: fine)").matches) {
    const slot = root.querySelector<HTMLElement>("[data-grid-pattern-slot]");
    if (slot) {
      void import("../../lib/grid-pattern").then(({ mountGridPattern }) => mountGridPattern(slot));
    }
  }
}
