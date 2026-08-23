import type Hls from "hls.js";

import { initHls } from "./hls";
import { byVisibility, nextVisible, shouldAutoplay, shouldShowPoster } from "./media-state";

type CardPlayer = {
  card: HTMLElement;
  video: HTMLVideoElement;
  poster: HTMLElement | null;
  hls: Hls | null;
  activated: boolean;
  loaded: boolean;
  visible: boolean;
  ratio: number;
  playing: boolean;
  resumeFrame: number;
};

const FREEZE = true;

export function bindProjectMedia(root: HTMLElement) {
  const players = new Map<HTMLElement, CardPlayer>();
  const playbackSource = root.querySelector("[data-projects-scroll-root]") ?? root;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let playbackEnabled = playbackSource.getAttribute("data-playback") !== "off";
  let activating = false;
  let destroyed = false;
  let drainFrame = 0;
  const pending: CardPlayer[] = [];

  const syncPlayer = (player: CardPlayer) => {
    const playing = shouldAutoplay({
      visible: player.visible,
      pageVisible: !document.hidden,
      playbackEnabled,
      reducedMotion: reducedMotion.matches,
    });
    const showPoster = shouldShowPoster({
      activated: player.activated,
      loaded: player.loaded,
      freezeFrameOnPause: FREEZE,
      playbackEnabled,
      playing,
    });

    player.poster?.classList.toggle("is-off", !showPoster);
    player.card.classList.toggle("is-playing", playing);

    if (!player.activated) {
      player.playing = false;
      return;
    }

    if (playing === player.playing && playing !== player.video.paused) {
      return;
    }

    player.playing = playing;

    if (playing) {
      player.hls?.startLoad();
      if (player.video.paused) {
        void player.video.play().catch(() => undefined);
      }
    } else {
      if (!player.video.paused) {
        player.video.pause();
      }
      player.hls?.stopLoad();
    }
  };

  const syncAll = () => {
    for (const player of players.values()) {
      syncPlayer(player);
    }
  };

  const activate = async (player: CardPlayer) => {
    if (
      destroyed ||
      player.activated ||
      reducedMotion.matches ||
      document.hidden ||
      !player.visible
    ) {
      return;
    }

    const src = player.card.dataset.mediaSrc;
    if (!src) {
      return;
    }

    player.activated = true;
    player.video.preload = "metadata";
    syncPlayer(player);

    try {
      const hls = await initHls(
        player.video,
        src,
        () => {
          if (destroyed) {
            return;
          }
          player.loaded = true;
          syncPlayer(player);
        },
        () => {
          if (!destroyed) {
            player.card.dataset.mediaError = "true";
          }
        },
      );
      if (destroyed) {
        hls?.destroy();
        return;
      }
      player.hls = hls;
      syncPlayer(player);
    } catch {
      if (!destroyed) {
        player.card.dataset.mediaError = "true";
      }
    }
  };

  const drain = () => {
    if (destroyed || activating || reducedMotion.matches || document.hidden) {
      return;
    }

    const next = pending.shift();
    if (!next) {
      return;
    }

    activating = true;
    void activate(next).finally(() => {
      activating = false;
      if (!destroyed && pending.length > 0) {
        drainFrame = requestAnimationFrame(() => {
          drainFrame = 0;
          drain();
        });
      }
    });
  };

  const enqueueVisible = () => {
    if (destroyed || !playbackEnabled || reducedMotion.matches || document.hidden) {
      return;
    }

    const waiting = [...players.values()]
      .filter((player) => player.visible && !player.activated && !pending.includes(player))
      .sort(byVisibility);

    pending.push(...waiting);
    drain();
  };

  const cards = [...root.querySelectorAll<HTMLElement>("[data-project-card]")];

  for (const card of cards) {
    const video = card.querySelector("video");
    if (!video || card.dataset.mediaType !== "video") {
      continue;
    }

    video.disableRemotePlayback = true;
    const player: CardPlayer = {
      card,
      video,
      poster: card.querySelector("[data-project-poster]"),
      hls: null,
      activated: false,
      loaded: false,
      visible: false,
      ratio: 0,
      playing: false,
      resumeFrame: 0,
    };
    video.addEventListener(
      "pause",
      () => {
        if (destroyed || !player.playing || document.hidden || player.resumeFrame !== 0) {
          return;
        }
        player.resumeFrame = requestAnimationFrame(() => {
          player.resumeFrame = 0;
          if (!destroyed && player.playing && player.video.paused) {
            void player.video.play().catch(() => undefined);
          }
        });
      },
      { signal: events.signal },
    );
    players.set(card, player);
  }

  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        const player = players.get(card);
        const ratio = entry.intersectionRatio;

        if (ratio > 0 && !card.dataset.viewed) {
          card.dataset.viewed = "true";
          card.dispatchEvent(new CustomEvent("project-card-viewed", { bubbles: true }));
        }

        if (!player) {
          continue;
        }

        player.ratio = ratio;
        player.visible = nextVisible(player.visible, ratio);
        card.dataset.visible = player.visible ? "true" : "false";
      }

      syncAll();
      enqueueVisible();
    },
    {
      threshold: [0, 0.1, 0.2, 0.5, 1],
    },
  );

  for (const card of cards) {
    visibility.observe(card);
  }

  const syncEnvironment = () => {
    if (document.hidden || reducedMotion.matches) {
      pending.length = 0;
    }
    syncAll();
    enqueueVisible();
  };

  document.addEventListener("visibilitychange", syncEnvironment, { signal: events.signal });
  reducedMotion.addEventListener("change", syncEnvironment, { signal: events.signal });

  return {
    setPlaybackEnabled(enabled: boolean) {
      if (destroyed) {
        return;
      }
      playbackEnabled = enabled;
      if (!enabled) {
        pending.length = 0;
      }
      syncAll();
      enqueueVisible();
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      events.abort();
      visibility.disconnect();
      pending.length = 0;
      if (drainFrame !== 0) {
        cancelAnimationFrame(drainFrame);
      }
      for (const player of players.values()) {
        player.playing = false;
        if (player.resumeFrame !== 0) {
          cancelAnimationFrame(player.resumeFrame);
        }
        player.video.pause();
        player.hls?.destroy();
      }
      players.clear();
    },
  };
}
