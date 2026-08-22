import {
  clipPathFor,
  clipProgress,
  GRAY_400,
  GRAY_700,
  interpolateColor,
  interpolateOpacity,
  PAINT_EPSILON,
  sectionProgress,
  TEXT_PRIMARY,
} from "./sticky-scroll";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function paintSection(el: HTMLElement, progress: number) {
  el.style.setProperty("--p", progress.toFixed(3));
  el.style.setProperty("--op", interpolateOpacity(progress).toFixed(3));
  el.style.setProperty("--title", interpolateColor(progress, GRAY_400, TEXT_PRIMARY));
  el.style.setProperty("--body", interpolateColor(progress, GRAY_400, GRAY_700));
}

function bindClosing(el: HTMLElement) {
  if (prefersReducedMotion()) {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.style.transition = "opacity 600ms ease, transform 600ms ease";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        } else {
          el.style.transition = "none";
          el.style.opacity = "0";
          el.style.transform = "translateY(50px)";
        }
      }
    },
    { threshold: 0.3 },
  );

  observer.observe(el);
}

function bindMobileReveals(root: HTMLElement) {
  const mq = window.matchMedia("(max-width: 1023px)");
  const targets = root.querySelectorAll<HTMLElement>("[data-image-panel], [data-text-section]");

  let observer: IntersectionObserver | undefined;

  const start = () => {
    observer?.disconnect();
    observer = undefined;

    if (!mq.matches || prefersReducedMotion()) {
      for (const target of targets) {
        target.classList.add("is-visible");
      }
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.35 },
    );

    for (const target of targets) {
      observer.observe(target);
    }
  };

  start();
  mq.addEventListener("change", start);
}

function bindStickyEntrance(el: HTMLElement) {
  if (prefersReducedMotion()) {
    el.classList.add("is-in");
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.classList.add("is-in");
          observer.disconnect();
        }
      }
    },
    { threshold: 0.3 },
  );

  observer.observe(el);
  return () => observer.disconnect();
}

function bindDesktopScroll(sections: HTMLElement[], panels: HTMLElement[]) {
  const lastProgress = new Float64Array(sections.length).fill(-1);
  const lastClip = new Float64Array(panels.length).fill(-1);
  let raf = 0;

  const update = () => {
    raf = 0;
    const viewportHeight = window.innerHeight;
    const rects = sections.map((section) => section.getBoundingClientRect());

    for (let index = 0; index < sections.length; index += 1) {
      const rect = rects[index];
      const section = sections[index];
      if (!rect || !section) {
        continue;
      }
      const progress = sectionProgress(rect, viewportHeight);
      if (Math.abs(progress - lastProgress[index]) < PAINT_EPSILON) {
        continue;
      }
      lastProgress[index] = progress;
      paintSection(section, progress);
    }

    for (let index = 1; index < sections.length; index += 1) {
      const rect = rects[index];
      const panel = panels[index];
      if (!rect || !panel) {
        continue;
      }
      const progress = clipProgress(rect, viewportHeight);
      if (Math.abs(progress - lastClip[index]) < PAINT_EPSILON) {
        continue;
      }
      lastClip[index] = progress;
      panel.style.clipPath = clipPathFor(progress);
    }
  };

  const schedule = () => {
    if (raf === 0) {
      raf = requestAnimationFrame(update);
    }
  };

  window.addEventListener("scroll", schedule, { passive: true });
  update();

  return () => {
    window.removeEventListener("scroll", schedule);
    if (raf !== 0) {
      cancelAnimationFrame(raf);
    }
  };
}

function bindDesktop(root: HTMLElement) {
  const layout = root.querySelector<HTMLElement>("[data-sticky-scroll]");
  const sticky = root.querySelector<HTMLElement>("[data-sticky-panel]");
  if (!layout || !sticky) {
    return;
  }

  const sections = [...root.querySelectorAll<HTMLElement>("[data-text-section]")];
  const panels = [...root.querySelectorAll<HTMLElement>("[data-image-panel]")];
  const mq = window.matchMedia("(min-width: 1024px)");

  let stopScroll: (() => void) | undefined;
  let stopNear: (() => void) | undefined;
  let stopEntrance: (() => void) | undefined;

  const attachScroll = () => {
    if (!stopScroll) {
      stopScroll = bindDesktopScroll(sections, panels);
    }
  };

  const detachScroll = () => {
    stopScroll?.();
    stopScroll = undefined;
  };

  const start = () => {
    stopNear?.();
    stopNear = undefined;
    stopEntrance?.();
    stopEntrance = undefined;
    detachScroll();

    if (!mq.matches) {
      return;
    }

    stopEntrance = bindStickyEntrance(sticky);

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          attachScroll();
        } else {
          detachScroll();
        }
      },
      { rootMargin: "100% 0px" },
    );

    near.observe(layout);
    stopNear = () => near.disconnect();
  };

  start();
  mq.addEventListener("change", start);
}

export function enhanceInfo(root: HTMLElement) {
  const closing = root.querySelector<HTMLElement>("[data-info-closing]");
  if (closing) {
    bindClosing(closing);
  }

  bindMobileReveals(root);
  bindDesktop(root);

  if (!prefersReducedMotion() && window.matchMedia("(pointer: fine)").matches) {
    const slot = root.querySelector<HTMLElement>("[data-grid-pattern-slot]");
    if (slot) {
      void import("../../lib/motion/grid-pattern").then(({ mountGridPattern }) =>
        mountGridPattern(slot),
      );
    }
  }
}
