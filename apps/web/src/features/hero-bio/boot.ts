import { trackContactCtaClicked } from "@portfolio-stack/analytics/events";

import { initScrollFallback } from "./fallback";

export function bootHeroBio() {
  const root = document.querySelector<HTMLElement>("[data-hero-bio]");
  if (root) {
    initScrollFallback(root);
  }

  document.querySelector<HTMLAnchorElement>("[data-hero-cta]")?.addEventListener("click", () => {
    trackContactCtaClicked({
      surface: "hero",
      label: "Request a project",
      destination: "/contact",
    });
  });

  const enhance = () => import("./enhance");
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => void enhance(), { timeout: 1500 });
  } else {
    setTimeout(() => void enhance(), 1);
  }
}

bootHeroBio();
