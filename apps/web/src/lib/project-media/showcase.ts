import { initHls } from "./hls";
import { shouldAutoplay } from "./media-state";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function bindShowcaseVideo(root: HTMLElement) {
  const card = root.querySelector<HTMLElement>("[data-showcase-video]");
  const video = card?.querySelector("video");
  const poster = card?.querySelector<HTMLElement>("[data-project-poster]");
  const src = card?.dataset.mediaSrc;
  if (!card || !video || !src) {
    return;
  }

  video.disableRemotePlayback = true;
  let activated = false;
  let loaded = false;
  let visible = false;
  let playing = false;
  let hls: Awaited<ReturnType<typeof initHls>> = null;

  const sync = () => {
    const shouldPlay = shouldAutoplay({
      visible,
      playbackEnabled: true,
      reducedMotion: prefersReducedMotion(),
    });
    poster?.classList.toggle("is-off", shouldPlay && loaded);
    card.classList.toggle("is-playing", shouldPlay);

    if (!activated) {
      return;
    }

    if (playing === shouldPlay) {
      return;
    }

    playing = shouldPlay;
    if (shouldPlay) {
      hls?.startLoad();
      if (video.paused) {
        void video.play().catch(() => undefined);
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
      hls?.stopLoad();
    }
  };

  const activate = async () => {
    if (activated || prefersReducedMotion() || !visible) {
      return;
    }
    activated = true;
    video.preload = "metadata";
    try {
      hls = await initHls(
        video,
        src,
        () => {
          loaded = true;
          sync();
        },
        () => {
          card.dataset.mediaError = "true";
        },
      );
      sync();
    } catch {
      card.dataset.mediaError = "true";
    }
  };

  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = (entry?.intersectionRatio ?? 0) >= 0.3;
      sync();
      if (visible) {
        void activate();
      }
    },
    { threshold: [0, 0.3, 0.6, 1], rootMargin: "50px" },
  );
  visibility.observe(card);

  if (window.matchMedia("(pointer: fine)").matches && card.dataset.liveUrl) {
    let frame = 0;
    let mx = 0;
    let my = 0;
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      mx = event.clientX - rect.left;
      my = event.clientY - rect.top;
      if (frame !== 0) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        card.style.setProperty("--mx", `${mx}px`);
        card.style.setProperty("--my", `${my}px`);
      });
    });
  }
}
