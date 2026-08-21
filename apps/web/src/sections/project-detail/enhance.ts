import {
  trackContactCtaClicked,
  trackOutboundLinkClicked,
  trackScrollDepthReached,
} from "@portfolio-stack/analytics/events";

import { bindShowcaseVideo } from "../../lib/project-media/showcase";
import { CTA_HREF, CTA_LABEL } from "./copy";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bindReveals(root: HTMLElement) {
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  if (prefersReducedMotion()) {
    for (const node of nodes) {
      node.classList.add("is-in");
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  for (const node of nodes) {
    observer.observe(node);
  }
}

function bindScrollDepth(root: HTMLElement) {
  const slug = root.dataset.projectSlug;
  const marks = [25, 50, 75, 100];
  const seen = new Set<number>();

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) {
      return;
    }
    const depth = Math.round((window.scrollY / max) * 100);
    for (const mark of marks) {
      if (depth >= mark && !seen.has(mark)) {
        seen.add(mark);
        trackScrollDepthReached({
          depth: mark,
          page: "project_detail",
          project_slug: slug,
        });
      }
    }
    if (seen.size === marks.length) {
      window.removeEventListener("scroll", onScroll);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function bindProjectCta(root: HTMLElement) {
  const cta = root.querySelector<HTMLElement>("[data-project-cta]");
  const link = root.querySelector<HTMLAnchorElement>("[data-project-cta-link]");
  if (!cta || !link) {
    return;
  }

  link.addEventListener("click", () => {
    trackContactCtaClicked({
      surface: "project_detail",
      label: CTA_LABEL,
      destination: CTA_HREF,
    });
  });

  if (prefersReducedMotion()) {
    return;
  }

  let enhanced = false;
  const enhance = async () => {
    if (enhanced) {
      return;
    }
    enhanced = true;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const [scrambleModule, gridModule] = await Promise.all([
      import("../../lib/text-scramble"),
      finePointer ? import("../../lib/grid-pattern") : Promise.resolve(null),
    ]);

    scrambleModule.bindHoverScramble(link, { duration: 0.5, speed: 0.04 });
    const slot = cta.querySelector<HTMLElement>("[data-grid-pattern-slot]");
    if (slot && gridModule) {
      gridModule.mountGridPattern(slot);
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void enhance();
      }
    },
    { rootMargin: "250px 0px", threshold: 0 },
  );
  observer.observe(cta);
  link.addEventListener("focus", () => void enhance(), { once: true });
}

export function enhanceProjectDetail(root: HTMLElement) {
  bindReveals(root);
  bindShowcaseVideo(root);
  bindScrollDepth(root);
  bindProjectCta(root);

  const live = root.querySelector<HTMLAnchorElement>("[data-live-link]");
  live?.addEventListener("click", () => {
    trackOutboundLinkClicked({
      destination: live.href,
      surface: "project_detail",
    });
  });
}
