import type Hls from "hls.js";

import { initHls } from "./hls";
import { byVisibility, nextVisible, shouldAutoplay, shouldShowPoster } from "./media-state";

type CardPlayer = {
  id: string;
  card: HTMLElement;
  video: HTMLVideoElement;
  poster: HTMLElement | null;
  hls: Hls | null;
  activated: boolean;
  loaded: boolean;
  visible: boolean;
  ratio: number;
  playing: boolean;
};

const FREEZE = true;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function bindProjectMedia(root: HTMLElement) {
  const players = new Map<HTMLElement, CardPlayer>();
  const playbackSource = root.querySelector("[data-projects-scroll-root]") ?? root;
  let playbackEnabled = playbackSource.getAttribute("data-playback") !== "off";
  let activating = false;
  const pending: CardPlayer[] = [];

  const syncPlayer = (player: CardPlayer) => {
    const playing = shouldAutoplay({
      visible: player.visible,
      playbackEnabled,
      reducedMotion: prefersReducedMotion(),
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
    if (player.activated || prefersReducedMotion() || !player.visible) {
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
      player.hls = await initHls(
        player.video,
        src,
        () => {
          player.loaded = true;
          syncPlayer(player);
        },
        () => {
          player.card.dataset.mediaError = "true";
        },
      );
      syncPlayer(player);
    } catch {
      player.card.dataset.mediaError = "true";
    }
  };

  const drain = () => {
    if (activating || prefersReducedMotion()) {
      return;
    }

    const next = pending.shift();
    if (!next) {
      return;
    }

    activating = true;
    void activate(next).finally(() => {
      activating = false;
      if (pending.length > 0) {
        requestAnimationFrame(drain);
      }
    });
  };

  const enqueueVisible = () => {
    if (!playbackEnabled || prefersReducedMotion()) {
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
      id: card.dataset.projectId ?? "",
      card,
      video,
      poster: card.querySelector("[data-project-poster]"),
      hls: null,
      activated: false,
      loaded: false,
      visible: false,
      ratio: 0,
      playing: false,
    };
    video.addEventListener("pause", () => {
      if (!player.playing || document.hidden) {
        return;
      }
      requestAnimationFrame(() => {
        if (player.playing && player.video.paused) {
          void player.video.play().catch(() => undefined);
        }
      });
    });
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

  return {
    setPlaybackEnabled(enabled: boolean) {
      playbackEnabled = enabled;
      if (!enabled) {
        pending.length = 0;
      }
      syncAll();
      enqueueVisible();
    },
    destroy() {
      visibility.disconnect();
      pending.length = 0;
      for (const player of players.values()) {
        player.playing = false;
        player.video.pause();
        player.hls?.destroy();
      }
      players.clear();
    },
  };
}
