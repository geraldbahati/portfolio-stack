import {
  bioBgOpacity,
  bioCtaProgress,
  bioImageProgress,
  getBioCharOpacity,
  heroScale,
  pinProgress,
  remap,
  TIMELINE,
} from "./timeline";

export function canUseCssScrollTimeline() {
  return (
    typeof CSS !== "undefined" &&
    (CSS.supports("animation-timeline: scroll(root block)") ||
      CSS.supports("animation-timeline", "scroll()"))
  );
}

function applyFallback(root: HTMLElement, progress: number, reduce: boolean) {
  const heroScaleEl = root.querySelector<HTMLElement>("[data-hero-scale]");
  const bioImage = root.querySelector<HTMLElement>("[data-bio-image]");
  const bioBg = root.querySelector<HTMLElement>("[data-bio-bg]");
  const bioCta = root.querySelector<HTMLElement>("[data-bio-cta]");
  const total = Number.parseInt(
    root.querySelector("[data-bio-section]")?.getAttribute("data-total-chars") || "0",
    10,
  );
  const effective = reduce ? 1 : progress;
  const textProgress = reduce ? 1 : remap(progress, TIMELINE.text.start, TIMELINE.text.end);
  const imageProgress = reduce ? 1 : bioImageProgress(progress);

  if (heroScaleEl) {
    heroScaleEl.style.transform = `scale(${heroScale(effective)}) translateZ(0)`;
  }

  if (bioImage) {
    bioImage.style.transform = `translateY(${100 - imageProgress * 100}px) scale(${0.6 + imageProgress * 0.4}) translateZ(0)`;
    bioImage.style.opacity = String(Math.min(1, imageProgress / 0.2));
  }

  if (bioBg) {
    bioBg.style.opacity = String(bioBgOpacity(effective));
  }

  if (bioCta) {
    const ctaProgress = bioCtaProgress(textProgress);
    bioCta.style.opacity = String(ctaProgress);
    bioCta.style.transform = `translateY(${20 - ctaProgress * 20}px)`;
  }

  for (const el of root.querySelectorAll<HTMLElement>("[data-char-index]")) {
    const index = Number.parseInt(el.dataset.charIndex || "0", 10);
    el.style.opacity = String(getBioCharOpacity(textProgress, index, total));
  }
}

export function initScrollFallback(root: HTMLElement) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || canUseCssScrollTimeline()) {
    return;
  }

  let rafId = 0;
  const update = () => {
    rafId = 0;
    const progress = pinProgress(-root.getBoundingClientRect().top, root.offsetHeight / 2);
    applyFallback(root, progress, reducedMotion.matches);
  };
  const schedule = () => {
    if (rafId === 0) {
      rafId = requestAnimationFrame(update);
    }
  };

  window.addEventListener("scroll", schedule, { passive: true });
  reducedMotion.addEventListener("change", schedule);
  schedule();
}
