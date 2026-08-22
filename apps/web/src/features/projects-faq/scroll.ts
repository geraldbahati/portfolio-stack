import {
  clampProgress,
  faqOffsetPx,
  faqTranslateY,
  HORIZONTAL_PHASE_END,
  isFaqCovering,
  isFaqPhase,
  PROGRESS_EPSILON,
  scrubToward,
  shouldCommitPx,
  trackTranslateX,
} from "./timeline";

type GalleryOptions = {
  onPlayback?: (enabled: boolean) => void;
};

export function bindGallery(root: HTMLElement, options: GalleryOptions = {}) {
  const trigger = root.querySelector<HTMLElement>("[data-projects-scroll-root]");
  const sticky = root.querySelector<HTMLElement>("[data-projects-sticky]");
  const surface = root.querySelector<HTMLElement>("[data-projects-surface]");
  const viewport = root.querySelector<HTMLElement>("[data-projects-viewport]");
  const track = root.querySelector<HTMLElement>("[data-projects-track]");
  const projectsArea = root.querySelector<HTMLElement>("[data-projects-area]");
  const faq = root.querySelector<HTMLElement>("[data-faq-section]");
  const title = root.querySelector<HTMLElement>("[data-projects-title]");
  const desc = root.querySelector<HTMLElement>("[data-projects-desc]");

  if (!trigger || !sticky || !viewport || !track || !projectsArea || !faq) {
    return;
  }

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const surfaceTarget = surface ?? sticky;

  let frameId = 0;
  let resizeFrameId = 0;
  let currentProgress = 0;
  let targetProgress = 0;
  let lastFrameTime = 0;
  let hasInitialProgress = false;
  let lastFaqShowing = false;
  let lastPlaybackActive = true;
  let lastScrubbing = false;
  let lastPhase = "";
  let lastTrackX = Number.NaN;
  let lastFaqY = Number.NaN;
  let lastFaqOffset = Number.NaN;
  let scrollAttached = false;
  let measureWhileScrubbing = false;

  let measurements = {
    sectionTop: 0,
    scrollableDistance: 1,
    horizontalTravel: 0,
    faqOffset: window.innerHeight * 0.3,
  };

  const setLayers = (on: boolean) => {
    track.style.willChange = on ? "transform" : "";
    faq.style.willChange = on ? "transform" : "";
  };

  const setFaqSurface = (isShowing: boolean) => {
    if (lastFaqShowing === isShowing) {
      return;
    }
    lastFaqShowing = isShowing;
    surfaceTarget.classList.toggle("is-dark", isShowing);
    title?.classList.toggle("text-text-inverted", isShowing);
    title?.classList.toggle("text-text-primary", !isShowing);
    desc?.classList.toggle("text-text-muted", isShowing);
    desc?.classList.toggle("text-text-secondary", !isShowing);
  };

  const readTargetProgress = () => {
    return clampProgress(window.scrollY - measurements.sectionTop, measurements.scrollableDistance);
  };

  const renderFrame = (timestamp: number) => {
    frameId = 0;
    targetProgress = readTargetProgress();

    if (!hasInitialProgress || reducedMotionQuery.matches) {
      currentProgress = targetProgress;
      hasInitialProgress = true;
    } else {
      currentProgress = scrubToward(
        currentProgress,
        targetProgress,
        timestamp - (lastFrameTime || timestamp),
      );
    }
    lastFrameTime = timestamp;

    const stillScrubbing =
      !reducedMotionQuery.matches && Math.abs(targetProgress - currentProgress) > PROGRESS_EPSILON;
    const trackX = trackTranslateX(currentProgress, measurements.horizontalTravel);
    const faqY = faqTranslateY(currentProgress, measurements.faqOffset);

    if (shouldCommitPx(trackX, lastTrackX) || !stillScrubbing) {
      lastTrackX = trackX;
      track.style.transform = `translate3d(${trackX.toFixed(2)}px, 0, 0)`;
    }
    if (shouldCommitPx(faqY, lastFaqY) || !stillScrubbing) {
      lastFaqY = faqY;
      faq.style.transform = `translate3d(0, ${faqY.toFixed(2)}px, 0)`;
    }

    const isFaqShowing = isFaqPhase(currentProgress, HORIZONTAL_PHASE_END);
    setFaqSurface(isFaqShowing);

    const nextPlaybackActive = !isFaqCovering(currentProgress);
    if (lastPlaybackActive !== nextPlaybackActive) {
      lastPlaybackActive = nextPlaybackActive;
      trigger.dataset.playback = nextPlaybackActive ? "on" : "off";
      options.onPlayback?.(nextPlaybackActive);
    }

    if (lastScrubbing !== stillScrubbing) {
      lastScrubbing = stillScrubbing;
      trigger.toggleAttribute("data-scrubbing", stillScrubbing);
      if (!stillScrubbing && measureWhileScrubbing) {
        measureWhileScrubbing = false;
        scheduleMeasure();
      }
    }

    const phase = isFaqShowing ? "faq" : "projects";
    if (lastPhase !== phase) {
      lastPhase = phase;
      trigger.dataset.animationPhase = phase;
    }

    if (stillScrubbing) {
      frameId = requestAnimationFrame(renderFrame);
    }
  };

  const scheduleRender = () => {
    if (frameId === 0) {
      frameId = requestAnimationFrame(renderFrame);
    }
  };

  const measure = () => {
    resizeFrameId = 0;
    if (lastScrubbing) {
      measureWhileScrubbing = true;
      return;
    }

    const viewportHeight = window.innerHeight;
    const triggerRect = trigger.getBoundingClientRect();
    const stickyRect = sticky.getBoundingClientRect();
    const projectsRect = projectsArea.getBoundingClientRect();
    const faqOffset = faqOffsetPx(viewportHeight, projectsRect.bottom - stickyRect.top);

    measurements = {
      sectionTop: window.scrollY + triggerRect.top,
      scrollableDistance: Math.max(1, trigger.offsetHeight - viewportHeight),
      horizontalTravel: Math.max(0, track.scrollWidth - viewport.clientWidth),
      faqOffset,
    };

    if (faqOffset !== lastFaqOffset) {
      lastFaqOffset = faqOffset;
      faq.style.setProperty("--faq-offset", `${faqOffset.toFixed(2)}px`);
    }
    scheduleRender();
  };

  const scheduleMeasure = () => {
    if (resizeFrameId !== 0) {
      cancelAnimationFrame(resizeFrameId);
    }
    resizeFrameId = requestAnimationFrame(measure);
  };

  const attachScroll = () => {
    if (scrollAttached) {
      return;
    }
    scrollAttached = true;
    setLayers(true);
    hasInitialProgress = false;
    window.addEventListener("scroll", scheduleRender, { passive: true });
    options.onPlayback?.(!isFaqCovering(readTargetProgress()));
    scheduleRender();
  };

  const detachScroll = () => {
    if (!scrollAttached) {
      return;
    }
    scrollAttached = false;
    window.removeEventListener("scroll", scheduleRender);
    if (frameId !== 0) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
    currentProgress = readTargetProgress();
    hasInitialProgress = true;
    lastScrubbing = false;
    trigger.removeAttribute("data-scrubbing");
    options.onPlayback?.(false);
    setLayers(false);
  };

  const resizeObserver = new ResizeObserver(scheduleMeasure);
  resizeObserver.observe(viewport);

  window.addEventListener("resize", scheduleMeasure, { passive: true });
  reducedMotionQuery.addEventListener("change", scheduleRender);

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
  near.observe(trigger);

  void document.fonts?.ready.then(scheduleMeasure);
  measure();
}
