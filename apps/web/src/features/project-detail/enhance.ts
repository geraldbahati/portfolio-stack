import {
  trackContactCtaClicked,
  trackOutboundLinkClicked,
  trackScrollDepthReached,
} from "@portfolio-stack/analytics/events";

import { bindShowcaseVideo } from "../../lib/project-media/showcase";
import { CTA_HREF, CTA_LABEL } from "./copy";

function bindReveals(root: HTMLElement) {
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) {
    for (const node of nodes) {
      node.classList.add("is-in");
    }
    return () => undefined;
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

  const revealForReducedMotion = () => {
    if (!reducedMotion.matches) {
      return;
    }
    observer.disconnect();
    for (const node of nodes) {
      node.classList.add("is-in");
    }
  };
  reducedMotion.addEventListener("change", revealForReducedMotion);

  return () => {
    observer.disconnect();
    reducedMotion.removeEventListener("change", revealForReducedMotion);
  };
}

function bindScrollDepth(root: HTMLElement) {
  const slug = root.dataset.projectSlug;
  const marks = [25, 50, 75, 100];
  const seen = new Set<number>();
  const events = new AbortController();
  let frame = 0;

  const measure = () => {
    frame = 0;
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
      events.abort();
    }
  };

  const onScroll = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(measure);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true, signal: events.signal });
  measure();

  return () => {
    events.abort();
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
  };
}

function bindProjectCta(root: HTMLElement) {
  const cta = root.querySelector<HTMLElement>("[data-project-cta]");
  const link = root.querySelector<HTMLAnchorElement>("[data-project-cta-link]");
  if (!cta || !link) {
    return () => undefined;
  }

  const events = new AbortController();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cleanups: Array<() => void> = [];
  let destroyed = false;
  let observer: IntersectionObserver | null = null;

  link.addEventListener(
    "click",
    () => {
      trackContactCtaClicked({
        surface: "project_detail",
        label: CTA_LABEL,
        destination: CTA_HREF,
      });
    },
    { signal: events.signal },
  );

  if (reducedMotion.matches) {
    return () => events.abort();
  }

  let enhanced = false;
  const enhance = async () => {
    if (enhanced) {
      return;
    }
    enhanced = true;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const [scrambleModule, gridModule] = await Promise.all([
      import("../../lib/motion/text-scramble"),
      finePointer ? import("../../lib/motion/grid-pattern") : Promise.resolve(null),
    ]);

    if (destroyed) {
      return;
    }

    cleanups.push(scrambleModule.bindHoverScramble(link, { duration: 0.5, speed: 0.04 }));
    const slot = cta.querySelector<HTMLElement>("[data-grid-pattern-slot]");
    if (slot && gridModule) {
      const cleanup = gridModule.mountGridPattern(slot);
      if (cleanup) {
        cleanups.push(cleanup);
      }
    }
  };

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer?.disconnect();
        void enhance();
      }
    },
    { rootMargin: "250px 0px", threshold: 0 },
  );
  observer.observe(cta);
  link.addEventListener("focus", () => void enhance(), { once: true, signal: events.signal });

  return () => {
    destroyed = true;
    events.abort();
    observer?.disconnect();
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

export function enhanceProjectDetail(root: HTMLElement) {
  const events = new AbortController();
  const cleanups = [
    bindReveals(root),
    bindShowcaseVideo(root),
    bindScrollDepth(root),
    bindProjectCta(root),
  ];

  const live = root.querySelector<HTMLAnchorElement>("[data-live-link]");
  live?.addEventListener(
    "click",
    () => {
      trackOutboundLinkClicked({
        destination: live.href,
        surface: "project_detail",
      });
    },
    { signal: events.signal },
  );

  return () => {
    events.abort();
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
