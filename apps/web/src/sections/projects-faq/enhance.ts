import { trackFaqOpened } from "@portfolio-stack/analytics/events";

import { bindProjectCards } from "../../lib/project-media/cards";
import { bindProjectMedia } from "../../lib/project-media/media";
import { bindGallery } from "./scroll";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bindOnceInView(el: HTMLElement, threshold = 0.1) {
  if (prefersReducedMotion()) {
    el.classList.add("is-in");
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        el.classList.add("is-in");
        observer.disconnect();
      }
    },
    { threshold },
  );
  observer.observe(el);
}

function bindHeader(root: HTMLElement) {
  const header = root.querySelector<HTMLElement>("[data-projects-header]");
  if (header) {
    bindOnceInView(header, 0.1);
  }

  const social = root.querySelector<HTMLElement>("[data-faq-social]");
  if (social) {
    bindOnceInView(social, 0.1);
  }
}

function bindFaq(root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLElement>("[data-faq-item]")];

  const setOpen = (openItem: HTMLElement | null) => {
    for (const item of items) {
      const expanded = item === openItem;
      item.classList.toggle("is-open", expanded);
      const button = item.querySelector<HTMLButtonElement>("button");
      const panel = item.querySelector<HTMLElement>("[data-faq-answer]");
      button?.setAttribute("aria-expanded", String(expanded));
      panel?.setAttribute("aria-hidden", String(!expanded));
    }
  };

  for (const item of items) {
    const button = item.querySelector<HTMLButtonElement>("button");
    button?.addEventListener("click", () => {
      const opening = !item.classList.contains("is-open");
      setOpen(opening ? item : null);
      if (opening) {
        trackFaqOpened({
          question: item.dataset.faqQuestion ?? "",
          position: Number(item.dataset.faqPosition ?? "0"),
        });
      }
    });
  }
}

export function enhanceProjectsFaq(root: HTMLElement) {
  const media = bindProjectMedia(root);
  bindGallery(root, {
    onPlayback(enabled) {
      media.setPlaybackEnabled(enabled);
    },
  });
  bindHeader(root);
  bindFaq(root);
  bindProjectCards(root, "home_grid");
}
