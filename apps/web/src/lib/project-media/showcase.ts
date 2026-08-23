import { initHls } from "./hls";
import { shouldAutoplay } from "./media-state";

export function bindShowcaseVideo(root: HTMLElement) {
  const card = root.querySelector<HTMLElement>("[data-showcase-video]");
  const video = card?.querySelector("video");
  const poster = card?.querySelector<HTMLElement>("[data-project-poster]");
  const src = card?.dataset.mediaSrc;
  if (!card || !video || !src) {
    return () => undefined;
  }

  video.disableRemotePlayback = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let activated = false;
  let loaded = false;
  let visible = false;
  let playing = false;
  let destroyed = false;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let resumeFrame = 0;
  let hls: Awaited<ReturnType<typeof initHls>> = null;

  const sync = () => {
    const shouldPlay = shouldAutoplay({
      visible,
      pageVisible: !document.hidden,
      playbackEnabled: true,
      reducedMotion: reducedMotion.matches,
    });
    poster?.classList.toggle("is-off", shouldPlay && loaded);
    card.classList.toggle("is-playing", shouldPlay);

    if (!activated) {
      return;
    }

    if (playing === shouldPlay && shouldPlay !== video.paused) {
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
    if (destroyed || activated || reducedMotion.matches || document.hidden || !visible) {
      return;
    }
    activated = true;
    video.preload = "metadata";
    try {
      hls = await initHls(
        video,
        src,
        () => {
          if (destroyed) {
            return;
          }
          loaded = true;
          sync();
        },
        () => {
          if (!destroyed) {
            card.dataset.mediaError = "true";
          }
        },
      );
      if (destroyed) {
        hls?.destroy();
        hls = null;
        return;
      }
      sync();
    } catch {
      if (!destroyed) {
        card.dataset.mediaError = "true";
      }
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

  const syncEnvironment = () => {
    sync();
    if (visible && !document.hidden && !reducedMotion.matches) {
      void activate();
    }
  };

  video.addEventListener(
    "pause",
    () => {
      if (destroyed || !playing || document.hidden || resumeFrame !== 0) {
        return;
      }
      resumeFrame = requestAnimationFrame(() => {
        resumeFrame = 0;
        if (!destroyed && playing && video.paused) {
          void video.play().catch(() => undefined);
        }
      });
    },
    { signal: events.signal },
  );
  document.addEventListener("visibilitychange", syncEnvironment, { signal: events.signal });
  reducedMotion.addEventListener("change", syncEnvironment, { signal: events.signal });

  if (window.matchMedia("(pointer: fine)").matches && card.dataset.liveUrl) {
    card.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (pointerFrame !== 0) {
          return;
        }
        pointerFrame = requestAnimationFrame(() => {
          pointerFrame = 0;
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${pointerX - rect.left}px`);
          card.style.setProperty("--my", `${pointerY - rect.top}px`);
        });
      },
      { signal: events.signal },
    );
  }

  return () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    events.abort();
    visibility.disconnect();
    if (pointerFrame !== 0) {
      cancelAnimationFrame(pointerFrame);
    }
    if (resumeFrame !== 0) {
      cancelAnimationFrame(resumeFrame);
    }
    playing = false;
    video.pause();
    hls?.destroy();
    hls = null;
  };
}
